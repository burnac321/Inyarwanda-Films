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
          'Cache-Control': 'public, max-age=31536000' // 1 year cache for 404s
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
          'Cache-Control': 'public, max-age=300' // 5 minutes cache for errors
        }
      });
    }

    const html = generateContentPage(contentData);
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return new Response('Error loading content', { 
      status: 500,
      headers: { 
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=300' // 5 minutes cache for errors
      }
    });
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

function generateContentPage(contentData) {
  const pageUrl = `https://inyarwanda-films.pages.dev/${contentData.category}/${contentData.slug}`;
  const isOdysee = contentData.videoUrl && contentData.videoUrl.includes('odysee.com');
  const embedUrl = isOdysee ? contentData.videoUrl.replace('https://odysee.com/', 'https://odysee.com/$/embed/') + '?r=1s8cJkToaSCoKtT2RyVTfP6V8ocp6cND' : contentData.videoUrl;
  
  // Format duration for Schema.org (ISO 8601)
  const isoDuration = formatISODuration(contentData.duration);
  // Format upload date for Schema.org (ISO 8601)
  const uploadDate = contentData.date ? new Date(contentData.date).toISOString() : new Date().toISOString();
  
  return `<!DOCTYPE html>
<html lang="rw">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>${escapeHTML(contentData.title)} | Watch Online - Inyarwanda Films</title>
    <meta name="description" content="${escapeHTML(contentData.metaDescription || contentData.description)}">
    <meta name="keywords" content="${generateKeywords(contentData)}">
    <meta name="author" content="Inyarwanda Films">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="video.episode">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${escapeHTML(contentData.title)} | Watch Online - Inyarwanda Films">
    <meta property="og:description" content="${escapeHTML(contentData.metaDescription || contentData.description)}">
    <meta property="og:image" content="${contentData.posterUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Inyarwanda Films">
    <meta property="video:duration" content="${isoDuration ? isoDuration.replace('PT', '').replace('M', '') : '1680'}">
    <meta property="video:release_date" content="${uploadDate}">
    <meta property="video:series" content="Inyarwanda Films">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="player">
    <meta property="twitter:url" content="${pageUrl}">
    <meta property="twitter:title" content="${escapeHTML(contentData.title)} | Watch Online - Inyarwanda Films">
    <meta property="twitter:description" content="${escapeHTML(contentData.metaDescription || contentData.description)}">
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
        "description": "${escapeHTML(contentData.metaDescription || contentData.description)}",
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
            "name": "Inyarwanda Films"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Inyarwanda Films",
            "logo": {
                "@type": "ImageObject",
                "url": "https://inyarwanda-films.pages.dev/logo.png"
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
        
        .logo {
            color: white;
            text-decoration: none;
            font-size: 1.5rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 0.5rem;
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
        
        .footer {
            background: var(--card-bg);
            padding: 3rem 0;
            margin-top: 4rem;
            border-top: 3px solid var(--primary);
            text-align: center;
        }
        
        @media (max-width: 768px) {
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
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header" role="banner">
        <div class="container">
            <a href="/" class="logo" aria-label="Inyarwanda Films Home">
                🎬 Inyarwanda Films
            </a>
        </div>
    </header>

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
                    
                    <p class="video-description">${escapeHTML(contentData.description)}</p>
                </div>
            </div>
            
            <!-- Movie Details -->
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
                
                <div class="details-card">
                    <h2>Cast & Crew</h2>
                    <div class="cast-crew">
                        ${contentData.director ? `
                        <div class="cast-item">
                            <strong>Director</strong>
                            <p>${escapeHTML(contentData.director)}</p>
                        </div>
                        ` : ''}
                        ${contentData.producer ? `
                        <div class="cast-item">
                            <strong>Producer</strong>
                            <p>${escapeHTML(contentData.producer)}</p>
                        </div>
                        ` : ''}
                        ${contentData.mainCast ? `
                        <div class="cast-item" style="grid-column: 1 / -1;">
                            <strong>Main Cast</strong>
                            <p>${escapeHTML(contentData.mainCast)}</p>
                        </div>
                        ` : ''}
                        ${!contentData.director && !contentData.producer && !contentData.mainCast ? `
                        <div class="cast-item" style="grid-column: 1 / -1;">
                            <p>Cast information not available</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="footer" role="contentinfo">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} Inyarwanda Films. All rights reserved.</p>
        </div>
    </footer>

    <script>
        // Video player functionality
        const thumbnail = document.getElementById('videoThumbnail');
        const playButton = document.getElementById('playButton');
        const videoFrame = document.getElementById('videoFrame');
        const isOdysee = ${isOdysee};
        const embedUrl = '${embedUrl}';

        const startVideo = () => {
            videoFrame.src = embedUrl;
            videoFrame.style.display = 'block';
            thumbnail.classList.add('hidden');
            
            // Focus on iframe for accessibility
            setTimeout(() => {
                videoFrame.focus();
            }, 100);
        };

        thumbnail.addEventListener('click', startVideo);
        playButton.addEventListener('click', (e) => {
            e.stopPropagation();
            startVideo();
        });

        // Keyboard accessibility
        thumbnail.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startVideo();
            }
        });

        // Set thumbnail alt text for accessibility
        thumbnail.setAttribute('role', 'img');
        thumbnail.setAttribute('aria-label', 'Thumbnail for ${escapeHTML(contentData.title)}');
    </script>
</body>
</html>`;
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
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateKeywords(contentData) {
  const base = [
    'Rwandan movies', 'Kinyarwanda films', 'Inyarwanda Films', 
    'watch online', 'stream movies', contentData.category,
    contentData.language || 'Kinyarwanda', 'African cinema'
  ];
  if (contentData.tags && contentData.tags.length > 0) {
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
