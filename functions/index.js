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

    // Get latest 5 videos per category for homepage sections
    const latestByCategory = getLatestVideosByCategory(allVideos, 5);
    const allCategories = [...new Set(allVideos.map(v => v.category).filter(Boolean))];

    // Get popular videos for footer (most recent 6 videos)
    const popularVideos = allVideos.slice(0, 6);

    const html = generateHomepageHTML({
      searchQuery,
      categoryFilter,
      filteredVideos,
      allVideos,
      allCategories,
      latestByCategory,
      popularVideos,
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

function getLatestVideosByCategory(videos, limit = 5) {
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
  const { searchQuery, categoryFilter, filteredVideos, allVideos, allCategories, latestByCategory, popularVideos, baseUrl } = data;
  const isSearchOrFilter = searchQuery || categoryFilter;

  return `<!DOCTYPE html>
<html lang="rw" itemscope itemtype="https://schema.org/VideoGallery">
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

        /* Video Grid */
        .videos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
        }

        .video-description {
            color: var(--text-light);
            font-size: 0.9rem;
            margin-bottom: 1rem;
            line-height: 1.4;
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
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
            .videos-grid {
                grid-template-columns: 1fr;
            }

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
            <section class="hero" itemprop="mainEntity" itemscope itemtype="https://schema.org/VideoGallery">
                <h1 itemprop="headline">Watch Rwandan Movies Online - Kinyarwanda Films & Comedy</h1>
                <p itemprop="description">Stream latest <strong>Rwandan comedy series</strong> like Papa Sava, <strong>Kinyarwanda drama films</strong>, and <strong>African music videos</strong>. 100% free streaming of authentic Rwandan entertainment.</p>
                
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
                    <h3>Popular Content</h3>
                    ${popularVideos.slice(0, 6).map(video => `
                        <a href="${baseUrl}/${video.category}/${video.slug}">${escapeHTML(video.title)}</a>
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
  
  return `
  <div class="video-card" itemprop="hasPart" itemscope itemtype="https://schema.org/VideoObject">
      <a href="${videoUrl}" class="video-link" itemprop="url">
          <div class="video-thumbnail">
              <img src="${posterUrl}" 
                   alt="Watch ${escapeHTML(video.title)} - Rwandan ${capitalizeFirst(video.category)}" 
                   itemprop="thumbnailUrl"
                   loading="lazy"
                   onerror="this.src='${baseUrl}/images/default-poster.jpg'">
              <div class="video-overlay">
                  <div class="play-button">▶</div>
              </div>
              <div class="video-badge">${video.quality || 'HD'}</div>
          </div>
          <div class="video-info">
              <h3 class="video-title" itemprop="name">${escapeHTML(video.title)}</h3>
              <p class="video-description" itemprop="description">${escapeHTML(video.metaDescription || video.description || 'Watch this Rwandan content online')}</p>
              <div class="video-meta">
                  <span class="video-year" itemprop="dateCreated">${video.releaseYear || new Date().getFullYear()}</span>
                  <span class="video-duration" itemprop="duration">${video.duration || ''}</span>
                  <span class="video-category" itemprop="genre">${capitalizeFirst(video.category)}</span>
              </div>
          </div>
      </a>
  </div>
  `;
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
