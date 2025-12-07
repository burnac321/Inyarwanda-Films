// _worker.js - Simplified version for Cloudflare Pages
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Show simple dashboard
    if (pathname === '/') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Movie Data Scraper</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            input, textarea { width: 100%; padding: 10px; margin: 10px 0; }
            button { background: #007acc; color: white; border: none; padding: 10px 20px; cursor: pointer; }
            .result { background: #f5f5f5; padding: 20px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>🎬 Movie Data Scraper</h1>
          
          <h3>Scrape Website for Movie Data</h3>
          <input type="url" id="websiteUrl" placeholder="https://rwandacinema.site/comedy/...">
          <button onclick="scrapeMovie()">Scrape & Save</button>
          
          <h3>OR Paste Raw HTML</h3>
          <textarea id="rawHtml" rows="10" placeholder="Paste HTML content here..."></textarea>
          <button onclick="processHtml()">Process HTML</button>
          
          <div id="result" class="result"></div>
          
          <script>
            async function scrapeMovie() {
              const url = document.getElementById('websiteUrl').value;
              if (!url) return alert('Enter website URL');
              
              document.getElementById('result').innerHTML = 'Scraping...';
              
              try {
                const response = await fetch('/api/scrape', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: url })
                });
                const data = await response.json();
                document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
              } catch (error) {
                document.getElementById('result').innerHTML = 'Error: ' + error.message;
              }
            }
            
            async function processHtml() {
              const html = document.getElementById('rawHtml').value;
              if (!html) return alert('Paste HTML content');
              
              document.getElementById('result').innerHTML = 'Processing...';
              
              try {
                const response = await fetch('/api/process-html', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ html: html })
                });
                const data = await response.json();
                document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
              } catch (error) {
                document.getElementById('result').innerHTML = 'Error: ' + error.message;
              }
            }
          </script>
        </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }
    
    // API endpoint to scrape website
    if (pathname === '/api/scrape') {
      return handleScrape(request, env);
    }
    
    // API endpoint to process raw HTML
    if (pathname === '/api/process-html') {
      return handleProcessHtml(request, env);
    }
    
    // API endpoint to save to GitHub
    if (pathname === '/api/save-movie') {
      return handleSaveMovie(request, env);
    }
    
    return new Response('Not found', { status: 404 });
  }
};

// Handle website scraping
async function handleScrape(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const { url } = await request.json();
    
    // Fetch the website
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to fetch URL: ${response.status}`
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    const html = await response.text();
    const movieData = extractMovieData(html, url);
    
    return new Response(JSON.stringify({
      success: true,
      movieData: movieData,
      extractedFrom: url
    }), { headers: { 'Content-Type': 'application/json' } });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { headers: { 'Content-Type': 'application/json' } });
  }
}

// Handle raw HTML processing
async function handleProcessHtml(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const { html, url = 'https://example.com' } = await request.json();
    const movieData = extractMovieData(html, url);
    
    return new Response(JSON.stringify({
      success: true,
      movieData: movieData
    }), { headers: { 'Content-Type': 'application/json' } });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { headers: { 'Content-Type': 'application/json' } });
  }
}

// Handle saving to GitHub
async function handleSaveMovie(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const { movieData } = await request.json();
    
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return new Response(JSON.stringify({
        success: false,
        error: 'GitHub credentials not configured'
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Generate channel slug from category
    const channelSlug = (movieData.category || 'general').toLowerCase().replace(/\s+/g, '-');
    const fileName = `video-1.json`;
    const filePath = `channels/${channelSlug}/${fileName}`;
    
    // Get existing file or create new
    let videos = [];
    let sha = null;
    
    try {
      const existing = await fetchGitHubFile(filePath, env);
      videos = JSON.parse(existing.content);
      sha = existing.sha;
    } catch (e) {
      // File doesn't exist, create new
    }
    
    // Add new movie
    videos.unshift({
      ...movieData,
      id: 'movie_' + Date.now(),
      date: new Date().toISOString()
    });
    
    // Limit to 100 videos
    if (videos.length > 100) {
      videos = videos.slice(0, 100);
    }
    
    // Save to GitHub
    const result = await saveToGitHub(filePath, JSON.stringify(videos, null, 2), env, sha);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Movie saved successfully',
      filePath: filePath,
      videoCount: videos.length,
      githubUrl: result.content?.html_url
    }), { headers: { 'Content-Type': 'application/json' } });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { headers: { 'Content-Type': 'application/json' } });
  }
}

// Extract movie data from HTML
function extractMovieData(html, url) {
  const result = {
    title: null,
    releaseYear: '2025',
    duration: null,
    language: 'Kinyarwanda',
    category: 'comedy',
    rating: 'G',
    quality: '1080p',
    description: null,
    videoUrl: null,
    posterUrl: null,
    director: '',
    producer: '',
    mainCast: '',
    supportingCast: '',
    metaDescription: null,
    tags: [],
    slug: null,
    date: new Date().toISOString()
  };
  
  try {
    // Extract YouTube ID
    const youtubeEmbedMatch = html.match(/https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (youtubeEmbedMatch) {
      result.videoUrl = youtubeEmbedMatch[0];
      result.youtubeId = youtubeEmbedMatch[1];
      result.posterUrl = `https://img.youtube.com/vi/${youtubeEmbedMatch[1]}/maxresdefault.jpg`;
    }
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      result.title = titleMatch[1].replace(/\s*\|\s*Watch.*$/i, '').trim();
    }
    
    // Extract description
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
    if (descMatch) {
      result.description = descMatch[1].trim();
      result.metaDescription = descMatch[1].trim();
    }
    
    // Extract duration from video-stats
    const durationMatch = html.match(/<span[^>]*class="[^"]*stat[^"]*"[^>]*>⏱️\s*([^<]+)<\/span>/i);
    if (durationMatch) {
      result.duration = durationMatch[1].trim();
    }
    
    // Extract language
    const languageMatch = html.match(/<span[^>]*class="[^"]*stat[^"]*"[^>]*>🗣️\s*([^<]+)<\/span>/i);
    if (languageMatch) {
      result.language = languageMatch[1].trim();
    }
    
    // Extract quality
    const qualityMatch = html.match(/<span[^>]*class="[^"]*stat[^"]*"[^>]*>🎬\s*([^<]+)<\/span>/i);
    if (qualityMatch) {
      result.quality = qualityMatch[1].trim();
    }
    
    // Extract rating
    const ratingMatch = html.match(/<span[^>]*class="[^"]*stat[^"]*"[^>]*>⭐\s*([^<]+)<\/span>/i);
    if (ratingMatch) {
      result.rating = ratingMatch[1].trim();
    }
    
    // Extract year
    const yearMatch = html.match(/<span[^>]*class="[^"]*stat[^"]*"[^>]*>📅\s*([^<]+)<\/span>/i);
    if (yearMatch) {
      result.releaseYear = yearMatch[1].trim();
    }
    
    // Extract main cast
    const castMatch = html.match(/<div[^>]*class="[^"]*cast-item[^"]*"[^>]*>\s*<strong>Main Cast<\/strong>\s*<p>([^<]+)<\/p>/i);
    if (castMatch) {
      result.mainCast = castMatch[1].trim();
    }
    
    // Generate slug from title or URL
    if (result.title) {
      result.slug = result.title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    } else {
      const urlMatch = url.match(/\/([^\/]+)$/);
      if (urlMatch) {
        result.slug = urlMatch[1];
      }
    }
    
    // Extract category from URL
    const categoryMatch = url.match(/\/(comedy|drama|action|romance|thriller|horror)\//i);
    if (categoryMatch) {
      result.category = categoryMatch[1].toLowerCase();
    }
    
  } catch (error) {
    console.error('Error extracting data:', error);
  }
  
  return result;
}

// GitHub helper functions
async function fetchGitHubFile(path, env) {
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`,
    {
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Movie-Scraper'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`File not found: ${path}`);
  }
  
  const data = await response.json();
  const content = atob(data.content.replace(/\n/g, ''));
  
  return {
    content: content,
    sha: data.sha
  };
}

async function saveToGitHub(path, content, env, sha = null) {
  const contentBase64 = btoa(unescape(encodeURIComponent(content)));
  
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Movie-Scraper'
      },
      body: JSON.stringify({
        message: `Add movie: ${path}`,
        content: contentBase64,
        branch: 'main',
        ...(sha && { sha })
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message}`);
  }
  
  return await response.json();
}
