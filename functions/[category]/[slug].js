// functions/[category]/[slug].js
export async function onRequest(context) {
  const { request, params, env } = context;
  const { category, slug } = params;

  try {
    // Use environment variables for security
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    const GITHUB_USERNAME = "burnac321";
    const GITHUB_REPO = "Inyarwanda-Films";
    
    const filePath = `content/movies/${category}/${slug}.md`;
    
    // Use GitHub API to access private repo
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filePath}`;
    
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Inyarwanda-Films',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      return new Response('Content not found', { 
        status: 404,
        headers: { 
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }

    const githubData = await response.json();
    const markdownContent = atob(githubData.content);
    const contentData = parseContentMarkdown(markdownContent, category, slug);

    if (!contentData) {
      return new Response('Error parsing content', { 
        status: 500,
        headers: { 
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }

    // Get other videos from the same category for related content
    const relatedVideos = await getRelatedVideos(env, category, slug);
    
    // Get 10 random latest videos from the same category
    const latestVideos = await getLatestVideos(env, category, slug, 10);
    
    const html = generateContentPage(contentData, relatedVideos, latestVideos);
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return new Response('Error loading content', { 
      status: 500,
      headers: { 
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
}

async function getLatestVideos(env, currentCategory, currentSlug, limit = 10) {
  try {
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    const GITHUB_USERNAME = "burnac321";
    const GITHUB_REPO = "Inyarwanda-Films";
    
    const categoryUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/content/movies/${currentCategory}`;
    
    const response = await fetch(categoryUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Inyarwanda-Films',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) return [];

    const files = await response.json();
    const allVideos = [];

    // Get all videos from the category
    for (const file of files) {
      if (file.name.endsWith('.md') && file.type === 'file') {
        const slug = file.name.replace('.md', '');
        
        // Skip the current video
        if (slug === currentSlug) continue;
        
        // Get basic file content to extract title and date
        const fileResponse = await fetch(file.url, {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'Inyarwanda-Films',
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          const content = atob(fileData.content);
          const videoData = parseContentMarkdown(content, currentCategory, slug);
          
          if (videoData && videoData.title) {
            // Add date for sorting (default to current date if not available)
            videoData.sortDate = videoData.date ? new Date(videoData.date) : new Date(fileData.created_at);
            videoData.slug = slug;
            videoData.category = currentCategory;
            allVideos.push(videoData);
          }
        }
      }
    }
    
    // Sort by date (newest first) and get random selection
    allVideos.sort((a, b) => b.sortDate - a.sortDate);
    
    // Get latest 10 videos
    const latestVideos = allVideos.slice(0, 20); // Get more than needed for random selection
    
    // Randomly select videos from the latest ones
    const randomVideos = [];
    const availableIndices = Array.from({length: Math.min(latestVideos.length, limit)}, (_, i) => i);
    
    // Shuffle and pick
    for (let i = 0; i < Math.min(limit, availableIndices.length); i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const videoIndex = availableIndices.splice(randomIndex, 1)[0];
      const video = latestVideos[videoIndex];
      
      // Clean up object for template
      const cleanVideo = {
        title: video.title,
        slug: video.slug,
        category: video.category,
        posterUrl: video.posterUrl,
        duration: video.duration,
        releaseYear: video.releaseYear,
        videoUrl: video.videoUrl,
        description: video.description
      };
      
      randomVideos.push(cleanVideo);
    }
    
    return randomVideos;
  } catch (error) {
    console.error('Error fetching latest videos:', error);
    return [];
  }
}

async function getRelatedVideos(env, currentCategory, currentSlug) {
  try {
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    const GITHUB_USERNAME = "burnac321";
    const GITHUB_REPO = "Inyarwanda-Films";
    
    const categoryUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/content/movies/${currentCategory}`;
    
    const response = await fetch(categoryUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Inyarwanda-Films',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) return [];

    const files = await response.json();
    const videos = [];

    // Get basic info from 2 other videos in the same category (excluding current)
    for (const file of files) {
      if (file.name.endsWith('.md') && file.type === 'file') {
        const slug = file.name.replace('.md', '');
        
        // Skip the current video
        if (slug === currentSlug) continue;
        
        // Get basic file content to extract title
        const fileResponse = await fetch(file.url, {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'Inyarwanda-Films',
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          const content = atob(fileData.content);
          const videoData = parseContentMarkdown(content, currentCategory, slug);
          
          if (videoData && videoData.title) {
            videos.push({
              title: videoData.title,
              slug: slug,
              category: currentCategory,
              posterUrl: videoData.posterUrl,
              duration: videoData.duration,
              releaseYear: videoData.releaseYear,
              videoUrl: videoData.videoUrl,
              description: videoData.description
            });
          }
        }
        
        // Only get 2 related videos
        if (videos.length >= 2) break;
      }
    }
    
    return videos;
  } catch (error) {
    console.error('Error fetching related videos:', error);
    return [];
  }
}

function parseContentMarkdown(content, category, slug) {
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatterMatch) return null;

  const frontMatter = frontMatterMatch[1];
  const data = { category, slug };

  frontMatter.split('\n').forEach(line => {
    const match = line.match(/(\w+):\s*(.*)/);
    if (match) {
      let [, key, value] = match;
      value = value.replace(/^["'](.*)["']$/, '$1').trim();
      
      if (key === 'tags' && value.startsWith('[')) {
        try { value = JSON.parse(value); } catch (e) { value = []; }
      }
      if (key === 'releaseYear') value = parseInt(value);
      
      data[key] = value;
    }
  });

  return data;
}

function generateContentPage(contentData, relatedVideos, latestVideos) {
  const pageUrl = `https://rwandacinema.site/${contentData.category}/${contentData.slug}`;
  const isOdysee = contentData.videoUrl && contentData.videoUrl.includes('odysee.com');
  const embedUrl = isOdysee ? contentData.videoUrl.replace('https://odysee.com/', 'https://odysee.com/$/embed/') + '?r=1s8cJkToaSCoKtT2RyVTfP6V8ocp6cND' : contentData.videoUrl;
  
  // Format duration for Schema.org (ISO 8601)
  const isoDuration = formatISODuration(contentData.duration);
  // Format upload date for Schema.org (ISO 8601)
  const uploadDate = contentData.date ? new Date(contentData.date).toISOString() : new Date().toISOString();
  
  // Truncate description for preview (250 characters)
  const fullDescription = contentData.description || '';
  const truncatedDescription = fullDescription.length > 250 ? 
    fullDescription.substring(0, 250) + '...' : 
    fullDescription;
  const showReadMore = fullDescription.length > 250;
  
  // Generate video cards HTML safely with ads integrated
  const generateVideoCardsWithAds = (videos, sectionTitle, sectionId) => {
    if (videos.length === 0) return '';
    
    let cardsHTML = '';
    let videoCount = 0;
    
    // Create 2x2 grid pattern: Video, Video, Ad, Video
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const title = escapeHTML(video.title);
      const category = video.category;
      const slug = video.slug;
      const posterUrl = video.posterUrl || 'https://inyarwanda-films.pages.dev/images/default-poster.jpg';
      const releaseYear = video.releaseYear || '';
      const duration = video.duration || '';
      
      // Add video card
      cardsHTML += `<a href="/${category}/${slug}" class="related-card video-item">
                      <div class="related-thumbnail">
                        <img src="${posterUrl}" 
                             alt="${title}" 
                             onerror="this.src='https://inyarwanda-films.pages.dev/images/default-poster.jpg'">
                        <div class="related-overlay">
                          <div class="related-play">▶</div>
                        </div>
                      </div>
                      <div class="related-info">
                        <h3 class="related-title">${title}</h3>
                        <div class="related-meta">
                          ${releaseYear ? `<span>${releaseYear}</span>` : ''}
                          ${duration ? `<span>${duration}</span>` : ''}
                        </div>
                      </div>
                    </a>`;
      
      videoCount++;
      
      // Insert native banner ad after every 2nd video (pattern: Video, Video, Ad)
      if (videoCount % 2 === 0 && i < videos.length - 1) {
        cardsHTML += `<div class="ad-native-banner" id="native-ad-${Math.floor(videoCount/2)}">
                        <div class="ad-label">Advertisement</div>
                        <div class="native-ad-container"></div>
                      </div>`;
      }
    }
    
    return `<section class="related-section" id="${sectionId}">
              <div class="section-header">
                <h2 class="section-title">${sectionTitle}</h2>
                <a href="/?category=${contentData.category}" class="view-all">View All ${capitalizeFirst(contentData.category)}</a>
              </div>
              <div class="related-grid with-ads">
                ${cardsHTML}
              </div>
            </section>`;
  };
  
  const html = `<!DOCTYPE html>
<html lang="rw">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>${escapeHTML(contentData.title)} | Watch Online - Rwanda Cinema</title>
    <meta name="description" content="${escapeHTML(contentData.metaDescription || contentData.description || 'Watch this Kinyarwanda film online')}">
    <meta name="keywords" content="${generateKeywords(contentData)}">
    <meta name="author" content="Rwanda Cinema">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="video.episode">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${escapeHTML(contentData.title)} | Watch Online - Rwanda Cinema">
    <meta property="og:description" content="${escapeHTML(contentData.metaDescription || contentData.description || 'Watch this Kinyarwanda film online')}">
    <meta property="og:image" content="${contentData.posterUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Rwanda Cinema">
    <meta property="video:duration" content="${isoDuration ? isoDuration.replace('PT', '').replace('M', '') : '1680'}">
    <meta property="video:release_date" content="${uploadDate}">
    <meta property="video:series" content="Rwanda Cinema">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="player">
    <meta property="twitter:url" content="${pageUrl}">
    <meta property="twitter:title" content="${escapeHTML(contentData.title)} | Watch Online - Rwanda Cinema">
    <meta property="twitter:description" content="${escapeHTML(contentData.metaDescription || contentData.description || 'Watch this Kinyarwanda film online')}">
    <meta property="twitter:image" content="${contentData.posterUrl}">
    <meta property="twitter:player" content="${pageUrl}">
    <meta property="twitter:player:width" content="1280">
    <meta property="twitter:player:height" content="720">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${pageUrl}">
    
    <!-- Schema.org Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": "${escapeHTML(contentData.title)}",
        "description": "${escapeHTML(contentData.metaDescription || contentData.description || 'Watch this Kinyarwanda film online')}",
        "thumbnailUrl": "${contentData.posterUrl}",
        "uploadDate": "${uploadDate}",
        "duration": "${isoDuration || 'PT28M'}",
        "contentUrl": "${contentData.videoUrl}",
        "embedUrl": "${pageUrl}",
        "genre": "${capitalizeFirst(contentData.category)}",
        "inLanguage": "rw",
        "contentRating": "${contentData.rating || 'G'}",
        "author": {
            "@type": "Organization",
            "name": "Rwanda Cinema"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Rwanda Cinema",
            "logo": {
                "@type": "ImageObject",
                "url": "https://rwandacinema.site/logo.png"
            }
        }
    }
    </script>
    
    <style>
        :root {
            --primary: #008753;
            --secondary: #FAD201;
            --accent: #00A1DE;
            --dark: #0a0a0a;
            --card-bg: #1a1a1a;
            --text-light: #e0e0e0;
            --border: #333;
        }
        
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
            font-family: 'Segoe UI', system-ui, sans-serif;
        }
        
        body { 
            background: var(--dark); 
            color: white; 
            line-height: 1.6;
            min-height: 100vh;
            padding-bottom: 80px; /* Space for floating button */
        }
        
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 0 1rem; 
        }
        
        .header { 
            background: var(--primary); 
            padding: 1rem 0; 
            border-bottom: 3px solid var(--secondary);
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2rem;
        }
        
        .logo {
            color: white;
            text-decoration: none;
            font-size: 1.5rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            white-space: nowrap;
        }
        
        .search-container {
            flex: 1;
            max-width: 500px;
            position: relative;
        }
        
        .search-form {
            display: flex;
            width: 100%;
        }
        
        .search-input {
            flex: 1;
            padding: 0.75rem 1rem;
            border: none;
            border-radius: 8px 0 0 8px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 1rem;
            outline: none;
            transition: all 0.3s ease;
        }
        
        .search-input:focus {
            background: rgba(255, 255, 255, 0.15);
            box-shadow: 0 0 0 3px rgba(250, 210, 1, 0.3);
        }
        
        .search-input::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }
        
        .search-button {
            background: var(--secondary);
            color: var(--dark);
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0 8px 8px 0;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .search-button:hover {
            background: #e0c001;
        }
        
        .search-results {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--card-bg);
            border-radius: 8px;
            margin-top: 0.5rem;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            max-height: 400px;
            overflow-y: auto;
            display: none;
            z-index: 1001;
        }
        
        .search-results.active {
            display: block;
        }
        
        .search-result-item {
            padding: 1rem;
            border-bottom: 1px solid var(--border);
            display: block;
            text-decoration: none;
            color: white;
            transition: background 0.3s ease;
        }
        
        .search-result-item:hover {
            background: rgba(0, 135, 83, 0.2);
        }
        
        .search-result-title {
            font-weight: bold;
            margin-bottom: 0.25rem;
            color: var(--secondary);
        }
        
        .search-result-category {
            font-size: 0.9rem;
            color: var(--text-light);
        }
        
        .no-results {
            padding: 1rem;
            text-align: center;
            color: var(--text-light);
        }
        
        .search-loading {
            padding: 1rem;
            text-align: center;
            color: var(--secondary);
        }
        
        .breadcrumb {
            background: var(--card-bg);
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            font-size: 0.9rem;
        }
        
        .breadcrumb a {
            color: var(--secondary);
            text-decoration: none;
        }
        
        .breadcrumb span {
            color: var(--text-light);
            margin: 0 0.5rem;
        }
        
        /* ========== AD STYLES ========== */
        .ad-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 1.5rem auto;
            padding: 0.5rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            overflow: hidden;
            width: 100%;
            max-width: 100%;
            position: relative;
        }
        
        .ad-leaderboard {
            width: 100%;
            max-width: 728px;
            height: 90px;
            margin: 0 auto;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .ad-sidebar {
            width: 300px;
            height: 250px;
            margin: 1rem auto;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Native Banner Ads - Matches video card size */
        .ad-native-banner {
            background: var(--card-bg);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--border);
            transition: all 0.3s ease;
            grid-column: span 1;
            position: relative;
            height: 100%;
            min-height: 260px;
            display: flex;
            flex-direction: column;
        }
        
        .ad-native-banner:hover {
            border-color: var(--primary);
            box-shadow: 0 8px 25px rgba(0, 135, 83, 0.15);
        }
        
        .ad-label {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.7);
            color: #999;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            z-index: 2;
            font-family: monospace;
            letter-spacing: 0.5px;
        }
        
        .native-ad-container {
            width: 100%;
            height: 100%;
            min-height: 260px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.1);
        }
        
        .native-ad-container iframe {
            width: 100% !important;
            height: 100% !important;
            border: none;
            border-radius: 12px;
        }
        
        .video-wrapper {
            background: #000;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            margin-bottom: 2rem;
        }
        
        .video-container {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%;
            background: #000;
        }
        
        .video-thumbnail {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.3s ease;
        }
        
        .video-thumbnail.hidden {
            opacity: 0;
            pointer-events: none;
        }
        
        .play-button {
            width: 80px;
            height: 80px;
            background: rgba(0, 135, 83, 0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 2rem;
            border: 4px solid white;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .play-button:hover {
            background: #006641;
            transform: scale(1.1);
        }
        
        .video-iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        }
        
        /* Hide Odysee branding and controls customization */
        .video-iframe.odysee {
            position: absolute !important;
            top: -60px !important;
            height: calc(100% + 120px) !important;
        }
        
        /* Floating Next Button */
        .floating-next-btn {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: linear-gradient(135deg, var(--primary), #006641);
            color: white;
            border: none;
            padding: 18px 20px;
            font-weight: bold;
            cursor: pointer;
            z-index: 1000;
            opacity: 0;
            transform: translateY(100%);
            transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            font-size: 16px;
            text-decoration: none;
            text-align: center;
        }
        
        .floating-next-btn.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        .floating-next-btn:hover {
            background: linear-gradient(135deg, #006641, #005233);
        }
        
        .floating-next-btn:active {
            transform: translateY(1px);
        }
        
        .next-btn-icon {
            font-size: 20px;
        }
        
        .next-btn-text {
            font-size: 16px;
            font-weight: bold;
        }
        
        .video-info {
            padding: 2rem;
            background: var(--card-bg);
        }
        
        .video-title {
            font-size: 2.2rem;
            font-weight: bold;
            color: white;
            margin-bottom: 1rem;
            line-height: 1.3;
        }
        
        .video-stats {
            display: flex;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
        }
        
        .stat {
            color: var(--text-light);
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .video-description {
            color: var(--text-light);
            line-height: 1.7;
            font-size: 1.1rem;
            position: relative;
        }
        
        .video-description.truncated {
            max-height: 120px;
            overflow: hidden;
        }
        
        .video-description.full {
            max-height: none;
        }
        
        .read-more-btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 0.5rem;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .read-more-btn:hover {
            background: #006641;
        }
        
        .movie-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .details-card {
            background: var(--card-bg);
            padding: 2rem;
            border-radius: 12px;
            border: 1px solid var(--border);
        }
        
        .details-card h2 {
            color: var(--secondary);
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 0.5rem;
        }
        
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .meta-item {
            margin-bottom: 1rem;
        }
        
        .meta-item strong {
            color: var(--secondary);
            display: block;
            margin-bottom: 0.25rem;
            font-size: 0.9rem;
        }
        
        .meta-item p {
            color: white;
            margin: 0;
            font-size: 1rem;
        }
        
        .cast-crew {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }
        
        .cast-item {
            background: #252525;
            padding: 1rem;
            border-radius: 8px;
            border-left: 4px solid var(--primary);
        }
        
        .cast-item strong {
            color: var(--secondary);
            display: block;
            margin-bottom: 0.5rem;
        }
        
        .cast-item p {
            color: white;
            margin: 0;
        }

        /* Related Videos Section */
        .related-section {
            margin: 4rem 0;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }

        .section-title {
            font-size: 1.8rem;
            color: var(--secondary);
            border-bottom: 3px solid var(--primary);
            padding-bottom: 0.5rem;
        }

        .view-all {
            color: var(--accent);
            text-decoration: none;
            font-weight: bold;
            transition: color 0.3s;
        }

        .view-all:hover {
            color: var(--secondary);
        }

        /* Grid with ads integrated */
        .related-grid.with-ads {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
            align-items: stretch;
        }

        .related-card {
            background: var(--card-bg);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
            border: 1px solid var(--border);
            text-decoration: none;
            color: inherit;
            display: block;
            height: 100%;
            min-height: 260px;
        }

        .related-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.4);
            border-color: var(--primary);
        }

        .related-thumbnail {
            position: relative;
            width: 100%;
            height: 160px;
            overflow: hidden;
        }

        .related-thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .related-card:hover .related-thumbnail img {
            transform: scale(1.05);
        }

        .related-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .related-card:hover .related-overlay {
            opacity: 1;
        }

        .related-play {
            width: 40px;
            height: 40px;
            background: rgba(0, 135, 83, 0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1rem;
            border: 2px solid white;
        }

        .related-info {
            padding: 1.2rem;
            height: calc(100% - 160px);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .related-title {
            font-size: 1.1rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
            line-height: 1.3;
            color: white;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .related-meta {
            display: flex;
            gap: 0.8rem;
            flex-wrap: wrap;
            margin-top: auto;
        }

        .related-meta span {
            background: rgba(255,255,255,0.1);
            padding: 0.2rem 0.6rem;
            border-radius: 4px;
            font-size: 0.8rem;
            color: var(--text-light);
        }
        
        .footer {
            background: var(--card-bg);
            padding: 3rem 0;
            margin-top: 4rem;
            border-top: 3px solid var(--primary);
            text-align: center;
        }
        
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 1rem;
            }
            
            .search-container {
                max-width: 100%;
            }
            
            .video-title {
                font-size: 1.8rem;
            }
            
            .video-stats {
                gap: 1rem;
            }
            
            .movie-details {
                grid-template-columns: 1fr;
            }
            
            .video-info {
                padding: 1.5rem;
            }

            .related-grid.with-ads {
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            }

            .section-header {
                flex-direction: column;
                gap: 1rem;
                align-items: flex-start;
            }
            
            .floating-next-btn {
                padding: 16px 20px;
                font-size: 15px;
            }
            
            .next-btn-text {
                font-size: 15px;
            }
            
            /* Adjust ads for mobile */
            .ad-leaderboard {
                max-width: 100%;
                height: auto;
                min-height: 90px;
            }
            
            .ad-sidebar {
                width: 100%;
                max-width: 300px;
                height: 250px;
            }
            
            .ad-native-banner {
                min-height: 240px;
            }
            
            .native-ad-container {
                min-height: 240px;
            }
        }
        
        @media (max-width: 480px) {
            .video-title {
                font-size: 1.5rem;
            }
            
            .video-stats {
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .play-button {
                width: 60px;
                height: 60px;
                font-size: 1.5rem;
            }

            .related-grid.with-ads {
                grid-template-columns: 1fr;
            }
            
            .floating-next-btn {
                padding: 14px 16px;
                font-size: 14px;
            }
            
            .next-btn-text {
                font-size: 14px;
            }
            
            .next-btn-icon {
                font-size: 18px;
            }
            
            /* Adjust ads for small screens */
            .ad-container {
                margin: 1rem 0;
                padding: 0.25rem;
            }
            
            .ad-leaderboard {
                height: 70px;
            }
            
            .ad-native-banner {
                min-height: 220px;
            }
            
            .native-ad-container {
                min-height: 220px;
            }
        }
    </style>
</head>
<body>
    <!-- Header with Search -->
    <header class="header" role="banner">
        <div class="container">
            <div class="header-content">
                <a href="/" class="logo" aria-label="Rwanda Cinema Home">
                    🎬 Rwanda Cinema
                </a>
                
                <div class="search-container">
                    <form class="search-form" id="searchForm">
                        <input type="text" 
                               class="search-input" 
                               id="searchInput" 
                               placeholder="Search for videos..." 
                               autocomplete="off"
                               aria-label="Search movies">
                        <button type="submit" class="search-button" aria-label="Search">
                            🔍 Search
                        </button>
                    </form>
                    <div class="search-results" id="searchResults" role="listbox">
                        <!-- Search results will be populated here -->
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Leaderboard Ad (728x90) - Top of page -->
    <div class="container">
        <div class="ad-container">
            <div class="ad-leaderboard" id="ad-leaderboard">
                <!-- Ad 2: Leaderboard (728x90) -->
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <main class="container" role="main">
        <!-- Breadcrumb -->
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span>></span>
            <a href="/?category=${contentData.category}">${capitalizeFirst(contentData.category)}</a>
            <span>></span>
            <span>${escapeHTML(contentData.title)}</span>
        </nav>

        <!-- Video Section -->
        <section class="video-section">
            <div class="video-wrapper">
                <div class="video-container">
                    <div class="video-thumbnail" id="videoThumbnail" 
                         style="background-image: url('${contentData.posterUrl}')">
                        <div class="play-button" id="playButton" aria-label="Play ${escapeHTML(contentData.title)}">
                            ▶
                        </div>
                    </div>
                    <iframe class="video-iframe ${isOdysee ? 'odysee' : ''}" 
                            id="videoFrame" 
                            style="display: none;"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowfullscreen
                            title="Watch ${escapeHTML(contentData.title)}">
                    </iframe>
                </div>
                
                <!-- Video Info -->
                <div class="video-info">
                    <h1 class="video-title">${escapeHTML(contentData.title)}</h1>
                    
                    <div class="video-stats">
                        <span class="stat">📅 ${contentData.releaseYear || '2025'}</span>
                        <span class="stat">⏱️ ${contentData.duration}</span>
                        <span class="stat">🗣️ ${contentData.language || 'Kinyarwanda'}</span>
                        <span class="stat">🎬 ${contentData.quality || '1080p'}</span>
                        <span class="stat">⭐ ${contentData.rating || 'G'}</span>
                    </div>
                    
                    <div class="video-description ${showReadMore ? 'truncated' : 'full'}" id="videoDescription">
                        ${escapeHTML(fullDescription)}
                    </div>
                    ${showReadMore ? '<button class="read-more-btn" id="readMoreBtn" onclick="toggleDescription()">Read More</button>' : ''}
                </div>
            </div>
            
            <!-- Movie Details with Sidebar Ads -->
            <div class="movie-details">
                <div class="details-card">
                    <h2>Content Information</h2>
                    <div class="meta-grid">
                        <div class="meta-item">
                            <strong>Category</strong>
                            <p>${capitalizeFirst(contentData.category)}</p>
                        </div>
                        <div class="meta-item">
                            <strong>Language</strong>
                            <p>${contentData.language || 'Kinyarwanda'}</p>
                        </div>
                        <div class="meta-item">
                            <strong>Quality</strong>
                            <p>${contentData.quality || '1080p'}</p>
                        </div>
                        <div class="meta-item">
                            <strong>Content Rating</strong>
                            <p>${contentData.rating || 'G'}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Sidebar Ad (300x250) - Between content cards -->
                <div class="ad-container ad-sidebar" style="grid-column: 1 / -1;">
                    <div id="ad-sidebar-1"></div>
                </div>
                
                <div class="details-card">
                    <h2>Cast & Crew</h2>
                    <div class="cast-crew">
                        ${contentData.director ? `<div class="cast-item">
                            <strong>Director</strong>
                            <p>${escapeHTML(contentData.director)}</p>
                        </div>` : ''}
                        ${contentData.producer ? `<div class="cast-item">
                            <strong>Producer</strong>
                            <p>${escapeHTML(contentData.producer)}</p>
                        </div>` : ''}
                        ${contentData.mainCast ? `<div class="cast-item" style="grid-column: 1 / -1;">
                            <strong>Main Cast</strong>
                            <p>${escapeHTML(contentData.mainCast)}</p>
                        </div>` : ''}
                        ${!contentData.director && !contentData.producer && !contentData.mainCast ? `<div class="cast-item" style="grid-column: 1 / -1;">
                            <p>Cast information not available</p>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </section>

        <!-- Latest Videos Section with integrated native banner ads -->
        <!-- Pattern: Video, Video, Ad, Video, Video, Ad, etc. -->
        ${generateVideoCardsWithAds(latestVideos, `Latest ${capitalizeFirst(contentData.category)} Videos`, 'latestVideos')}

        <!-- Related Videos Section -->
        ${generateVideoCards(relatedVideos, `Recommended ${capitalizeFirst(contentData.category)} Videos`, 'relatedVideos')}
        
        <!-- Additional Sidebar Ad at bottom -->
        <div class="ad-container ad-sidebar">
            <div id="ad-sidebar-2"></div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="footer" role="contentinfo">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} Inyarwanda Films. All rights reserved.</p>
        </div>
    </footer>

    <!-- Floating Next Button -->
    ${latestVideos.length > 0 ? `<a href="#latestVideos" class="floating-next-btn" id="floatingNextBtn">
        <span class="next-btn-icon">⏭️</span>
        <span class="next-btn-text">Watch More ${capitalizeFirst(contentData.category)} Videos</span>
    </a>` : ''}

    <script>
        // Video player functionality
        const thumbnail = document.getElementById('videoThumbnail');
        const playButton = document.getElementById('playButton');
        const videoFrame = document.getElementById('videoFrame');
        const floatingNextBtn = document.getElementById('floatingNextBtn');
        const isOdysee = ${isOdysee};
        const embedUrl = '${embedUrl}';
        
        let inactivityTimer;
        let isVideoPlaying = false;
        let isMouseOverPlayer = false;

        const startVideo = () => {
            videoFrame.src = embedUrl;
            videoFrame.style.display = 'block';
            thumbnail.classList.add('hidden');
            isVideoPlaying = true;
            
            // Start monitoring inactivity
            startInactivityTimer();
            
            // Focus on iframe for accessibility
            setTimeout(() => {
                videoFrame.focus();
            }, 100);
        };

        const startInactivityTimer = () => {
            clearTimeout(inactivityTimer);
            hideNextButton();
            
            inactivityTimer = setTimeout(() => {
                if (isVideoPlaying && !isMouseOverPlayer) {
                    showNextButton();
                }
            }, 3000); // 3 seconds inactivity
        };

        const showNextButton = () => {
            if (floatingNextBtn) {
                floatingNextBtn.classList.add('visible');
            }
        };

        const hideNextButton = () => {
            if (floatingNextBtn) {
                floatingNextBtn.classList.remove('visible');
            }
        };

        // Description toggle functionality
        function toggleDescription() {
            const description = document.getElementById('videoDescription');
            const readMoreBtn = document.getElementById('readMoreBtn');
            
            if (description.classList.contains('truncated')) {
                description.classList.remove('truncated');
                description.classList.add('full');
                readMoreBtn.textContent = 'Read Less';
            } else {
                description.classList.remove('full');
                description.classList.add('truncated');
                readMoreBtn.textContent = 'Read More';
            }
        }

        // Search functionality
        const searchForm = document.getElementById('searchForm');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        const searchContainer = document.querySelector('.search-container');
        
        let searchTimeout;
        let searchAbortController = null;

        // Fetch all movies from GitHub API for search
        async function performSearch(query) {
            if (!query.trim() || query.length < 2) {
                searchResults.classList.remove('active');
                return;
            }
            
            // Cancel previous search if still running
            if (searchAbortController) {
                searchAbortController.abort();
            }
            
            searchAbortController = new AbortController();
            
            searchResults.innerHTML = '<div class="search-loading">Searching...</div>';
            searchResults.classList.add('active');
            
            try {
                // Call the API search endpoint
                const searchUrl = \`/api/search?q=\${encodeURIComponent(query)}\`;
                
                const response = await fetch(searchUrl, {
                    signal: searchAbortController.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(\`Search failed: \${response.status}\`);
                }
                
                const results = await response.json();
                
                if (results && results.length > 0) {
                    const html = results.map(result => \`
                        <a href="/\${result.category}/\${result.slug}" class="search-result-item">
                            <div class="search-result-title">\${escapeText(result.title)}</div>
                            <div class="search-result-category">\${capitalizeFirst(result.category)}</div>
                        </a>
                    \`).join('');
                    searchResults.innerHTML = html;
                } else {
                    searchResults.innerHTML = '<div class="no-results">No videos found</div>';
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    return; // Search was cancelled
                }
                console.error('Search error:', error);
                searchResults.innerHTML = '<div class="no-results">Error searching. Please try again.</div>';
            }
        }

        // Helper function for escaping text in JavaScript
        function escapeText(str) {
            if (!str) return '';
            return str.replace(/[&<>"']/g, 
                tag => ({
                    '&': '&amp;', '<': '&lt;', '>': '&gt;',
                    '"': '&quot;', "'": '&#39;'
                }[tag]));
        }

        // Helper function for capitalizing first letter in JavaScript
        function capitalizeFirst(str) {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        }

        // Event Listeners for search
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value;
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    performSearch(query);
                }, 300);
            } else {
                searchResults.classList.remove('active');
            }
        });

        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput.value;
            if (query.length >= 2) {
                performSearch(query);
            }
        });

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) {
                searchResults.classList.remove('active');
            }
        });

        // Close search results with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchResults.classList.remove('active');
                searchInput.blur();
            }
        });

        // Event Listeners for video
        thumbnail.addEventListener('click', startVideo);
        playButton.addEventListener('click', (e) => {
            e.stopPropagation();
            startVideo();
        });

        // Mouse movement detection for entire page
        document.addEventListener('mousemove', () => {
            if (isVideoPlaying) {
                startInactivityTimer();
            }
        });

        // Video frame interactions - hide next button when interacting with player
        if (videoFrame) {
            videoFrame.addEventListener('mouseenter', () => {
                isMouseOverPlayer = true;
                hideNextButton();
            });
            
            videoFrame.addEventListener('mouseleave', () => {
                isMouseOverPlayer = false;
                startInactivityTimer();
            });
            
            videoFrame.addEventListener('click', () => {
                hideNextButton();
                startInactivityTimer();
            });
            
            videoFrame.addEventListener('mousemove', () => {
                hideNextButton();
                startInactivityTimer();
            });
        }

        // Also hide next button when clicking near the video player
        document.addEventListener('click', (e) => {
            const videoWrapper = document.querySelector('.video-wrapper');
            if (videoWrapper && videoWrapper.contains(e.target)) {
                hideNextButton();
                startInactivityTimer();
            }
        });

        // Keyboard accessibility
        thumbnail.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startVideo();
            }
        });

        // Smooth scroll for the floating button
        if (floatingNextBtn) {
            floatingNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const latestSection = document.getElementById('latestVideos');
                if (latestSection) {
                    latestSection.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                    // Hide the button after click
                    hideNextButton();
                }
            });
        }

        // Set thumbnail alt text for accessibility
        thumbnail.setAttribute('role', 'img');
        thumbnail.setAttribute('aria-label', 'Thumbnail for ${escapeHTML(contentData.title)}');
        
        // ========== ADVANCED AD MANAGEMENT ==========
        class AdManager {
            constructor() {
                this.adsLoaded = false;
                this.adContainers = [];
                this.init();
            }
            
            init() {
                // Wait for DOM to be fully loaded
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.loadAds());
                } else {
                    this.loadAds();
                }
            }
            
            loadAds() {
                if (this.adsLoaded) return;
                
                // Load Leaderboard Ad (728x90)
                this.loadAd({
                    key: '0c1a394389e9b8057fb1ff87c2f59610',
                    format: 'iframe',
                    height: 90,
                    width: 728,
                    containerId: 'ad-leaderboard'
                });
                
                // Load Sidebar Ads (300x250)
                this.loadAd({
                    key: '213fdc3e1b3f9258d1950caae29e5874',
                    format: 'iframe',
                    height: 250,
                    width: 300,
                    containerId: 'ad-sidebar-1'
                });
                
                // Load additional sidebar ad with delay
                setTimeout(() => {
                    this.loadAd({
                        key: '213fdc3e1b3f9258d1950caae29e5874',
                        format: 'iframe',
                        height: 250,
                        width: 300,
                        containerId: 'ad-sidebar-2'
                    });
                }, 1500);
                
                // Load Native Banner Ads (pattern: after every 2 videos)
                this.loadNativeBannerAds();
                
                this.adsLoaded = true;
            }
            
            loadAd(config) {
                const container = document.getElementById(config.containerId);
                if (!container) return;
                
                // Create ad script
                const adScript = document.createElement('script');
                adScript.type = 'text/javascript';
                adScript.innerHTML = \`
                    atOptions = {
                        'key' : '\${config.key}',
                        'format' : '\${config.format}',
                        'height' : \${config.height},
                        'width' : \${config.width},
                        'params' : {}
                    };
                \`;
                document.head.appendChild(adScript);
                
                // Create invoke script
                const invokeScript = document.createElement('script');
                invokeScript.type = 'text/javascript';
                invokeScript.src = \`https://blubberlog.com/\${config.key}/invoke.js\`;
                invokeScript.async = true;
                
                // Add error handling
                invokeScript.onerror = () => {
                    console.warn(\`Ad failed to load: \${config.containerId}\`);
                    this.showFallbackAd(container);
                };
                
                container.appendChild(invokeScript);
                this.adContainers.push(container);
            }
            
            loadNativeBannerAds() {
                // Find all native ad containers
                const nativeAdContainers = document.querySelectorAll('.native-ad-container');
                
                nativeAdContainers.forEach((container, index) => {
                    // Add delay for staggered loading
                    setTimeout(() => {
                        const adScript = document.createElement('script');
                        adScript.type = 'text/javascript';
                        adScript.innerHTML = \`
                            atOptions = {
                                'key' : '213fdc3e1b3f9258d1950caae29e5874',
                                'format' : 'iframe',
                                'height' : 250,
                                'width' : 300,
                                'params' : {}
                            };
                        \`;
                        document.head.appendChild(adScript);
                        
                        const invokeScript = document.createElement('script');
                        invokeScript.type = 'text/javascript';
                        invokeScript.src = 'https://blubberlog.com/213fdc3e1b3f9258d1950caae29e5874/invoke.js';
                        invokeScript.async = true;
                        
                        invokeScript.onerror = () => {
                            this.showFallbackAd(container);
                        };
                        
                        container.appendChild(invokeScript);
                    }, 1000 + (index * 500)); // Staggered loading
                });
            }
            
            showFallbackAd(container) {
                // Optional: Show fallback content or retry
                container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Advertisement</div>';
            }
            
            refreshAds() {
                // Optional: Implement ad refresh logic
                console.log('Refreshing ads...');
            }
            
            trackAdView(adId) {
                // Optional: Implement ad tracking
                console.log('Ad viewed:', adId);
            }
        }
        
        // Initialize ad manager
        const adManager = new AdManager();
        
        // Lazy load ads when they come into viewport
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const adId = entry.target.id;
                    if (adId && adId.startsWith('native-ad-')) {
                        adManager.trackAdView(adId);
                    }
                }
            });
        }, { threshold: 0.3 });
        
        // Observe all ad containers
        document.querySelectorAll('.ad-native-banner, .ad-container').forEach(container => {
            observer.observe(container);
        });
    </script>
    
    <!-- Social Bar Ad - Placed before closing body tag as requested -->
    <script type="text/javascript" src="https://blubberlog.com/a0/c2/a4/a0c2a488172371a54bbbe38d4202f89d.js"></script>
</body>
</html>`;

  return html;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, 
    tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    }[tag]));
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateKeywords(contentData) {
  const base = [
    'Rwandan movies', 'Kinyarwanda films', 'Inyarwanda Films', 
    'watch online', 'stream movies', contentData.category,
    contentData.language || 'Kinyarwanda', 'African cinema'
  ];
  if (contentData.tags && Array.isArray(contentData.tags)) {
    base.push(...contentData.tags);
  }
  return base.join(', ');
}

function formatISODuration(duration) {
  if (!duration) return 'PT28M';
  
  // Convert "28 minutes" to "PT28M"
  const match = duration.match(/(\d+)\s*minutes?/i);
  if (match) {
    return `PT${match[1]}M`;
  }
  
  // Convert "1h 45 minutes" to "PT1H45M"
  const complexMatch = duration.match(/(\d+)h\s*(\d+)\s*minutes?/i);
  if (complexMatch) {
    return `PT${complexMatch[1]}H${complexMatch[2]}M`;
  }
  
  return 'PT28M'; // Default fallback
}
