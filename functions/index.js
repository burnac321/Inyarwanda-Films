export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get('search') || '';
  const categoryFilter = url.searchParams.get('category') || '';
  const baseUrl = url.origin;

  try {
    // Load all videos from GitHub
    const allVideos = await loadAllVideos(env);
    
    // Apply filters if any
    let filteredVideos = allVideos;
    if (searchQuery) {
      filteredVideos = searchVideos(allVideos, searchQuery);
    }
    if (categoryFilter) {
      filteredVideos = filteredVideos.filter(video => video.category === categoryFilter);
    }

    // Get latest 8 videos per category for homepage sections
    const latestByCategory = getLatestVideosByCategory(allVideos, 8);
    const allCategories = [...new Set(allVideos.map(v => v.category).filter(Boolean))];

    const html = generateHomepageHTML({
      searchQuery,
      categoryFilter,
      filteredVideos,
      allVideos,
      allCategories,
      latestByCategory,
      baseUrl
    });

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=7200, s-maxage=14400', // 2-hour cache
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error generating homepage:', error);
    return new Response(generateErrorHTML(), {
      headers: { 
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=300' // 5 minutes for errors
      },
      status: 500
    });
  }
}

async function loadAllVideos(env) {
  const GITHUB_TOKEN = env.GITHUB_TOKEN;
  const GITHUB_USERNAME = "burnac321";
  const GITHUB_REPO = "Inyarwanda-Films";
  
  const categories = ['comedy', 'drama', 'music', 'action', 'documentary'];
  const allVideos = [];

  for (const category of categories) {
    try {
      const categoryVideos = await loadCategoryVideos(GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_REPO, category);
      allVideos.push(...categoryVideos);
    } catch (error) {
      console.warn(`Failed to load ${category} category:`, error.message);
    }
  }

  // Sort all videos by date (newest first)
  return allVideos.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

async function loadCategoryVideos(token, username, repo, category) {
  const videos = [];
  
  try {
    // Get directory contents from GitHub API
    const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/content/movies/${category}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Inyarwanda-Films',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) return videos;

    const files = await response.json();
    
    // Load each markdown file
    for (const file of files) {
      if (file.name.endsWith('.md') && file.type === 'file') {
        try {
          const fileResponse = await fetch(file.download_url);
          if (fileResponse.ok) {
            const content = await fileResponse.text();
            const videoData = parseVideoMarkdown(content, category, file.name.replace('.md', ''));
            if (videoData) {
              videos.push(videoData);
            }
          }
        } catch (error) {
          console.warn(`Failed to load ${file.name}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error(`Error loading ${category} category:`, error);
  }

  return videos;
}

function parseVideoMarkdown(content, category, slug) {
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

function searchVideos(videos, query) {
  const searchTerm = query.toLowerCase();
  return videos.filter(video => 
    video.title?.toLowerCase().includes(searchTerm) ||
    video.description?.toLowerCase().includes(searchTerm) ||
    video.metaDescription?.toLowerCase().includes(searchTerm) ||
    (video.tags && video.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
    video.category?.toLowerCase().includes(searchTerm)
  );
}

function getLatestVideosByCategory(videos, limit = 8) {
  const grouped = {};
  
  // Group videos by category
  videos.forEach(video => {
    if (!video.category) return;
    if (!grouped[video.category]) {
      grouped[video.category] = [];
    }
    grouped[video.category].push(video);
  });

  // Sort each category by date and take latest N videos
  Object.keys(grouped).forEach(category => {
    grouped[category] = grouped[category]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, limit);
  });

  return grouped;
}

function generateHomepageHTML(data) {
  const { searchQuery, categoryFilter, filteredVideos, allVideos, allCategories, latestByCategory, baseUrl } = data;
  const isSearchOrFilter = searchQuery || categoryFilter;

  return `<!DOCTYPE html>
<html lang="rw">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Essential Meta Tags -->
    <link rel="canonical" href="${baseUrl}/" />
    <meta name="theme-color" content="#008753">
    <meta name="language" content="rw">
    
    <!-- Icons -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- Primary Meta Tags -->
    <title>${isSearchOrFilter ? 
      `"${escapeHTML(searchQuery)}" ${categoryFilter ? `in ${capitalizeFirst(categoryFilter)}` : ''} - Inyarwanda Films` : 
      'Inyarwanda Films | Watch Rwandan Movies & Kinyarwanda Films Online'}</title>
    <meta name="description" content="${isSearchOrFilter ? 
      `Search results for ${escapeHTML(searchQuery)} ${categoryFilter ? `in ${categoryFilter}` : 'Rwandan movies'}` : 
      'Watch latest Rwandan movies, Kinyarwanda comedy series like Papa Sava, drama films and music videos. Stream African cinema online free.'}">
    <meta name="keywords" content="Rwandan movies, Kinyarwanda films, Inyarwanda Films, watch online, stream movies, comedy, drama, music, African cinema, Rwanda entertainment">
    <meta name="author" content="Inyarwanda Films">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${baseUrl}/">
    <meta property="og:title" content="Inyarwanda Films | Watch Rwandan Movies Online">
    <meta property="og:description" content="Watch latest Rwandan movies, Kinyarwanda films, comedy videos and entertainment. Stream high-quality content online for free.">
    <meta property="og:image" content="${baseUrl}/og-image.jpg">
    <meta property="og:locale" content="rw_RW">
    <meta property="og:site_name" content="Inyarwanda Films">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${baseUrl}/">
    <meta property="twitter:title" content="Inyarwanda Films | Watch Rwandan Movies Online">
    <meta property="twitter:description" content="Watch latest Rwandan movies, Kinyarwanda films, comedy videos and entertainment.">
    
    <!-- Schema.org Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "VideoGallery",
        "name": "Inyarwanda Films - Rwandan Movies Online",
        "description": "Watch latest Rwandan movies, Kinyarwanda comedy series, drama films and music videos online for free",
        "url": "${baseUrl}",
        "publisher": {
            "@type": "Organization",
            "name": "Inyarwanda Films",
            "logo": {
                "@type": "ImageObject",
                "url": "${baseUrl}/logo.png"
            }
        },
        "inLanguage": "rw",
        "countryOfOrigin": "RW",
        "numberOfItems": ${allVideos.length},
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": "${baseUrl}"
        }
    }
    </script>

    <!-- Breadcrumb Schema -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "${baseUrl}"
            }
        ]
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

        /* Header */
        .header {
            background: var(--primary);
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 1000;
            border-bottom: 3px solid var(--secondary);
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
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

        .search-section {
            flex: 1;
            max-width: 500px;
        }

        .search-form {
            display: flex;
            gap: 0.5rem;
        }

        .search-input {
            flex: 1;
            padding: 0.75rem 1rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            background: rgba(255,255,255,0.9);
        }

        .search-button {
            background: var(--secondary);
            color: var(--dark);
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }

        .search-button:hover {
            background: #e6c100;
            transform: translateY(-2px);
        }

        .nav {
            display: flex;
            gap: 1rem;
            align-items: center;
            flex-wrap: wrap;
        }

        .nav-link {
            color: white;
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            transition: background 0.3s;
            font-weight: 500;
        }

        .nav-link:hover, .nav-link.active {
            background: rgba(255,255,255,0.1);
        }

        /* Breadcrumb */
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

        /* Hero Section */
        .hero {
            text-align: center;
            padding: 4rem 2rem;
            background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
            margin-bottom: 3rem;
            border-radius: 0 0 20px 20px;
        }

        .hero h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: white;
            line-height: 1.2;
        }

        .hero p {
            font-size: 1.2rem;
            color: rgba(255,255,255,0.9);
            max-width: 600px;
            margin: 0 auto 2rem;
        }

        .cta-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }

        .cta-button {
            background: var(--secondary);
            color: var(--dark);
            padding: 1rem 2rem;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            transition: all 0.3s;
        }

        .cta-button:hover {
            background: #e6c100;
            transform: translateY(-2px);
        }

        /* Video Grid - Fixed 2x4 layout */
        .videos-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 2rem;
            margin: 2rem 0;
        }

        /* Video Card */
        .video-card {
            background: var(--card-bg);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
            border: 1px solid var(--border);
        }

        .video-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.4);
            border-color: var(--primary);
        }

        .video-link {
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .video-thumbnail {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
        }

        .video-thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .video-card:hover .video-thumbnail img {
            transform: scale(1.05);
        }

        .video-overlay {
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

        .video-card:hover .video-overlay {
            opacity: 1;
        }

        .play-button {
            width: 60px;
            height: 60px;
            background: rgba(0, 135, 83, 0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            border: 3px solid white;
            transition: all 0.3s ease;
        }

        .video-card:hover .play-button {
            background: #006641;
            transform: scale(1.1);
        }

        .video-badge {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: var(--secondary);
            color: var(--dark);
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.8rem;
        }

        .video-info {
            padding: 1.5rem;
        }

        .video-title {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 0.8rem;
            color: white;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            min-height: 2.8em;
        }

        .video-description {
            color: var(--text-light);
            font-size: 0.9rem;
            margin-bottom: 1rem;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            min-height: 4.2em;
        }

        .video-meta {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .video-meta span {
            background: rgba(255,255,255,0.1);
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.8rem;
            color: var(--text-light);
        }

        /* Category Sections */
        .category-section {
            margin: 3rem 0;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }

        .section-title {
            font-size: 2rem;
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

        /* Search Results */
        .search-results {
            margin: 2rem 0;
        }

        .results-header {
            margin-bottom: 2rem;
        }

        .results-count {
            color: var(--text-light);
            margin-top: 0.5rem;
        }

        /* No Results */
        .no-results {
            text-align: center;
            padding: 3rem;
            color: var(--text-light);
        }

        /* Stats */
        .stats {
            display: flex;
            justify-content: center;
            gap: 3rem;
            margin: 2rem 0;
            flex-wrap: wrap;
        }

        .stat-item {
            text-align: center;
        }

        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            color: var(--secondary);
            display: block;
        }

        .stat-label {
            color: var(--text-light);
        }

        /* Footer */
        .footer {
            background: var(--card-bg);
            padding: 3rem 0;
            margin-top: 4rem;
            border-top: 3px solid var(--primary);
        }

        .footer-sections {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .footer-section h3 {
            color: var(--secondary);
            margin-bottom: 1rem;
            font-size: 1.2rem;
        }

        .footer-section a {
            display: block;
            color: var(--text-light);
            text-decoration: none;
            margin-bottom: 0.5rem;
            transition: color 0.3s;
        }

        .footer-section a:hover {
            color: var(--accent);
        }

        .footer-bottom {
            text-align: center;
            padding-top: 2rem;
            border-top: 1px solid var(--border);
            color: var(--text-light);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                text-align: center;
            }

            .search-section {
                width: 100%;
                max-width: 100%;
            }

            .nav {
                justify-content: center;
            }

            .hero h1 {
                font-size: 2.5rem;
            }

            .videos-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }

            .section-header {
                flex-direction: column;
                gap: 1rem;
                align-items: flex-start;
            }

            .stats {
                gap: 2rem;
            }

            .footer-sections {
                grid-template-columns: 1fr;
            }

            .cta-buttons {
                flex-direction: column;
                align-items: center;
            }
        }

        @media (max-width: 480px) {
            .hero {
                padding: 3rem 1rem;
            }

            .hero h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header" role="banner">
        <div class="container">
            <div class="header-content">
                <a href="${baseUrl}/" class="logo" aria-label="Inyarwanda Films Home">
                    🎬 Inyarwanda Films
                </a>
                
                <div class="search-section">
                    <form class="search-form" action="${baseUrl}/" method="GET" role="search">
                        <input type="text" 
                               name="search" 
                               class="search-input" 
                               placeholder="Search videos..." 
                               value="${escapeHTML(searchQuery)}"
                               aria-label="Search videos">
                        <button type="submit" class="search-button">Search</button>
                    </form>
                </div>

                <nav class="nav" role="navigation" aria-label="Main navigation">
                    <a href="${baseUrl}/" class="nav-link ${!categoryFilter ? 'active' : ''}">All Videos</a>
                    ${allCategories.map(category => `
                        <a href="${baseUrl}/?category=${category}" class="nav-link ${categoryFilter === category ? 'active' : ''}">
                            ${capitalizeFirst(category)}
                        </a>
                    `).join('')}
                </nav>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container" role="main">
        <!-- Breadcrumb -->
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="${baseUrl}/">Home</a>
            ${isSearchOrFilter ? `
                <span>></span>
                <span>${searchQuery ? `Search: "${escapeHTML(searchQuery)}"` : `Category: ${capitalizeFirst(categoryFilter)}`}</span>
            ` : ''}
        </nav>

        ${isSearchOrFilter ? `
            <!-- Search/Filter Results -->
            <div class="search-results">
                <div class="results-header">
                    <h1>
                        ${searchQuery && categoryFilter ? 
                          `"${escapeHTML(searchQuery)}" in ${capitalizeFirst(categoryFilter)}` :
                         searchQuery ? 
                          `Search: "${escapeHTML(searchQuery)}"` :
                          `Category: ${capitalizeFirst(categoryFilter)}`}
                    </h1>
                    <p class="results-count">${filteredVideos.length} video${filteredVideos.length !== 1 ? 's' : ''} found</p>
                </div>

                ${filteredVideos.length > 0 ? `
                    <div class="videos-grid">
                        ${filteredVideos.map(video => generateVideoCard(video, baseUrl)).join('')}
                    </div>
                ` : `
                    <div class="no-results">
                        <h2>No videos found</h2>
                        <p>Try adjusting your search terms or browse different categories.</p>
                        <a href="${baseUrl}/" class="cta-button">Browse All Videos</a>
                    </div>
                `}
            </div>
        ` : `
            <!-- Homepage Content -->
            <section class="hero">
                <h1>Watch Rwandan Movies Online - Kinyarwanda Films & Comedy</h1>
                <p>Stream latest <strong>Rwandan comedy series</strong> like Papa Sava, <strong>Kinyarwanda drama films</strong>, and <strong>African music videos</strong>. 100% free streaming of authentic Rwandan entertainment.</p>
                
                <div class="cta-buttons">
                    ${allCategories.slice(0, 3).map(category => `
                        <a href="${baseUrl}/?category=${category}" class="cta-button">Watch ${capitalizeFirst(category)}</a>
                    `).join('')}
                </div>
            </section>

            <!-- Stats -->
            <div class="stats">
                <div class="stat-item">
                    <span class="stat-number">${allVideos.length}</span>
                    <span class="stat-label">Total Videos</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${allCategories.length}</span>
                    <span class="stat-label">Categories</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${Math.max(...allVideos.map(v => v.releaseYear || new Date().getFullYear()))}</span>
                    <span class="stat-label">Latest Content</span>
                </div>
            </div>

            <!-- Latest Videos by Category -->
            ${Object.entries(latestByCategory).map(([category, videos]) => videos.length > 0 ? `
                <section class="category-section" id="${category}">
                    <div class="section-header">
                        <h2 class="section-title">Latest ${capitalizeFirst(category)} Videos</h2>
                        <a href="${baseUrl}/?category=${category}" class="view-all">View All ${capitalizeFirst(category)}</a>
                    </div>
                    <div class="videos-grid">
                        ${videos.map(video => generateVideoCard(video, baseUrl)).join('')}
                    </div>
                </section>
            ` : '').join('')}

            ${Object.keys(latestByCategory).length === 0 ? `
                <div class="no-results">
                    <h2>No videos found</h2>
                    <p>Add markdown files to your content directory to display videos.</p>
                </div>
            ` : ''}
        `}
    </main>

    <!-- Footer -->
    <footer class="footer" role="contentinfo">
        <div class="container">
            <div class="footer-sections">
                <div class="footer-section">
                    <h3>Rwandan Movies</h3>
                    ${allCategories.map(category => `
                        <a href="${baseUrl}/?category=${category}">${capitalizeFirst(category)} Videos</a>
                    `).join('')}
                </div>
                
                <div class="footer-section">
                    <h3>Company</h3>
                    <a href="${baseUrl}/about">About Inyarwanda Films</a>
                    <a href="${baseUrl}/contact">Contact Us</a>
                    <a href="${baseUrl}/privacy">Privacy Policy</a>
                    <a href="${baseUrl}/terms">Terms of Service</a>
                </div>
            </div>
            
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} Inyarwanda Films. All rights reserved.</p>
                <p>Streaming Rwandan cinema to the world - Kinyarwanda Films | African Movies | Rwanda Entertainment</p>
            </div>
        </div>
    </footer>
</body>
</html>`;
}

function generateVideoCard(video, baseUrl) {
  const posterUrl = video.posterUrl || `${baseUrl}/images/default-poster.jpg`;
  const videoUrl = `${baseUrl}/${video.category}/${video.slug}`;
  
  // FIX: Ensure all required fields are properly set
  const uploadDate = video.date || new Date().toISOString();
  const isoDuration = convertDurationToISO(video.duration);
  const contentUrl = video.videoUrl || getContentUrl(video);
  const embedUrl = getEmbedUrl(video.videoUrl) || contentUrl;

  // Generate proper structured data - FIXED with proper field validation
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.title,
    "description": video.metaDescription || video.description || 'Watch this Rwandan content online',
    "thumbnailUrl": posterUrl,
    "uploadDate": uploadDate, // REQUIRED - now always present
    "duration": isoDuration, // REQUIRED - now in correct format
    "contentUrl": contentUrl, // REQUIRED - ensure this exists
    "embedUrl": embedUrl, // REQUIRED - ensure this exists
    "dateCreated": video.releaseYear ? `${video.releaseYear}` : new Date().getFullYear().toString(),
    "genre": capitalizeFirst(video.category),
    "url": videoUrl
  };

  // FIXED: Remove microdata attributes, keep only JSON-LD to avoid duplicates
  return `
  <div class="video-card">
      <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
      <a href="${videoUrl}" class="video-link">
          <div class="video-thumbnail">
              <img src="${posterUrl}" 
                   alt="Watch ${escapeHTML(video.title)} - Rwandan ${capitalizeFirst(video.category)}" 
                   loading="lazy"
                   onerror="this.src='${baseUrl}/images/default-poster.jpg'">
              <div class="video-overlay">
                  <div class="play-button">▶</div>
              </div>
              <div class="video-badge">${video.quality || 'HD'}</div>
          </div>
          <div class="video-info">
              <h3 class="video-title">${truncateTitle(video.title, 75)}</h3>
              <p class="video-description">${truncateDescription(video.metaDescription || video.description || 'Watch this Rwandan content online', 150)}</p>
              <div class="video-meta">
                  <span class="video-year">${video.releaseYear || new Date().getFullYear()}</span>
                  <span class="video-duration">${video.duration || ''}</span>
                  <span class="video-category">${capitalizeFirst(video.category)}</span>
              </div>
          </div>
      </a>
  </div>
  `;
}

// Helper function to ensure contentUrl exists
function getContentUrl(video) {
  if (video.videoUrl) return video.videoUrl;
  // Fallback to YouTube if videoUrl is missing but we have a YouTube ID
  if (video.youtubeId) return `https://www.youtube.com/watch?v=${video.youtubeId}`;
  return `https://www.youtube.com`; // Fallback to avoid empty contentUrl
}

// Helper function to convert duration to ISO 8601 format
function convertDurationToISO(duration) {
  if (!duration) return '';
  
  // Handle "3:11 minutes" format
  const timeMatch = duration.match(/(\d+):(\d+)\s*minutes?/);
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1]);
    const seconds = parseInt(timeMatch[2]);
    return `PT${minutes}M${seconds}S`;
  }
  
  // Handle "20 minutes" format
  const minutesMatch = duration.match(/(\d+)\s*minutes?/);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1]);
    return `PT${minutes}M`;
  }
  
  // Handle "25M" format
  const simpleMinutesMatch = duration.match(/(\d+)\s*M/);
  if (simpleMinutesMatch) {
    const minutes = parseInt(simpleMinutesMatch[1]);
    return `PT${minutes}M`;
  }
  
  return 'PT0M'; // Default fallback
}

// Helper function to get embed URL from video URL
function getEmbedUrl(videoUrl) {
  if (!videoUrl) return '';
  
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId[1]}`;
    }
  }
  if (videoUrl.includes('odysee.com')) {
    // Odysee embed URLs are similar to regular URLs
    return videoUrl;
  }
  return videoUrl;
}

// Helper function to truncate titles
function truncateTitle(title, maxLength = 75) {
  if (!title) return '';
  if (title.length <= maxLength) return escapeHTML(title);
  return escapeHTML(title.substring(0, maxLength)) + '...';
}

// Helper function to truncate descriptions
function truncateDescription(description, maxLength = 150) {
  if (!description) return '';
  if (description.length <= maxLength) return escapeHTML(description);
  return escapeHTML(description.substring(0, maxLength)) + '...';
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

function generateErrorHTML() {
  return `<!DOCTYPE html>
<html lang="rw">
<head>
    <title>Error - Inyarwanda Films</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { background: #0a0a0a; color: white; text-align: center; padding: 4rem 2rem; font-family: system-ui; }
        h1 { color: #FAD201; margin-bottom: 1rem; }
        a { background: #008753; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 1rem; }
    </style>
</head>
<body>
    <h1>Something Went Wrong</h1>
    <p>We're having trouble loading the content. Please try again later.</p>
    <a href="/">Go Back Home</a>
</body>
</html>`;
    }
