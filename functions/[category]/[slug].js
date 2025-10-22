export async function onRequest(context) {
  const { request, params } = context;
  const { category, slug } = params;

  try {
    // All content is under movies/ directory
    const filePath = `content/movies/${category}/${slug}.md`;

    // Fetch the markdown file from your GitHub repo
    const GITHUB_RAW_URL = `https://raw.githubusercontent.com/burnac321/Inyarwanda-Films/main/${filePath}`;
    
    const response = await fetch(GITHUB_RAW_URL);
    
    if (!response.ok) {
      return new Response('Content not found', { status: 404 });
    }

    const markdownContent = await response.text();
    const contentData = parseContentMarkdown(markdownContent, category, slug);

    // Generate the HTML page with Odysee embed
    const html = generateContentPage(contentData);
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
      },
    });
  } catch (error) {
    return new Response('Error loading content', { status: 500 });
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
  const isOdysee = contentData.videoUrl.includes('odysee.com');
  
  return `<!DOCTYPE html>
<html lang="rw" itemscope itemtype="http://schema.org/WebPage">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>${escapeHTML(contentData.title)} - Inyarwanda Films</title>
    <meta name="description" content="${escapeHTML(contentData.metaDescription || contentData.description)}">
    <meta name="keywords" content="${generateKeywords(contentData)}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="video.movie">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${escapeHTML(contentData.title)} - Inyarwanda Films">
    <meta property="og:description" content="${escapeHTML(contentData.metaDescription || contentData.description)}">
    <meta property="og:image" content="${contentData.posterUrl}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${pageUrl}">
    <meta property="twitter:title" content="${escapeHTML(contentData.title)} - Inyarwanda Films">
    <meta property="twitter:description" content="${escapeHTML(contentData.metaDescription || contentData.description)}">
    <meta property="twitter:image" content="${contentData.posterUrl}">
    
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
        .video-wrapper {
            background: #000;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            margin: 2rem 0;
        }
        .video-container {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%;
        }
        .video-iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        }
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
        .logo {
            color: white;
            text-decoration: none;
            font-size: 1.5rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 0.5rem;
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
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <a href="/" class="logo">
                🎬 Inyarwanda Films
            </a>
        </div>
    </header>

    <main class="container">
        <div class="video-wrapper">
            <div class="video-container">
                ${isOdysee ? 
                  `<iframe class="video-iframe odysee" 
                    src="${contentData.videoUrl.replace('https://odysee.com/', 'https://odysee.com/$/embed/')}"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowfullscreen
                    title="Watch ${escapeHTML(contentData.title)}">
                   </iframe>` :
                  `<video controls poster="${contentData.posterUrl}" class="video-iframe">
                    <source src="${contentData.videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                   </video>`
                }
            </div>
            
            <div class="video-info">
                <h1 class="video-title">${escapeHTML(contentData.title)}</h1>
                
                <div class="video-stats">
                    <span class="stat">📅 ${contentData.releaseYear}</span>
                    <span class="stat">⏱️ ${contentData.duration}</span>
                    <span class="stat">🗣️ ${contentData.language}</span>
                    <span class="stat">🎬 ${contentData.quality}</span>
                    <span class="stat">⭐ ${contentData.rating}</span>
                </div>
                
                <p class="video-description">${escapeHTML(contentData.description)}</p>
            </div>
        </div>
        
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
                        <p>${contentData.language}</p>
                    </div>
                    <div class="meta-item">
                        <strong>Quality</strong>
                        <p>${contentData.quality}</p>
                    </div>
                    <div class="meta-item">
                        <strong>Content Rating</strong>
                        <p>${contentData.rating}</p>
                    </div>
                </div>
            </div>
            
            ${(contentData.director || contentData.producer || contentData.mainCast) ? `
            <div class="details-card">
                <h2>Cast & Crew</h2>
                <div class="meta-grid">
                    ${contentData.director ? `
                    <div class="meta-item">
                        <strong>Director</strong>
                        <p>${escapeHTML(contentData.director)}</p>
                    </div>
                    ` : ''}
                    ${contentData.producer ? `
                    <div class="meta-item">
                        <strong>Producer</strong>
                        <p>${escapeHTML(contentData.producer)}</p>
                    </div>
                    ` : ''}
                    ${contentData.mainCast ? `
                    <div class="meta-item" style="grid-column: 1 / -1;">
                        <strong>Main Cast</strong>
                        <p>${escapeHTML(contentData.mainCast)}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
        </div>
    </main>
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
  const base = ['Rwandan movies', 'Kinyarwanda films', 'Inyarwanda Films', contentData.category];
  if (contentData.tags) base.push(...contentData.tags);
  return base.join(', ');
                                   }
