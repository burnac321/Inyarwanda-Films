// _worker.js - Simple website scraper for movie data
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Show dashboard
    if (pathname === '/' || pathname === '/dashboard.html') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Movie Data Scraper</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; max-width: 800px; }
            .input-group { margin: 20px 0; }
            input { width: 100%; padding: 12px; font-size: 16px; margin: 10px 0; }
            button { background: #4f46e5; color: white; border: none; padding: 12px 24px; 
                     font-size: 16px; cursor: pointer; border-radius: 6px; }
            .loading { display: none; color: #4f46e5; margin: 10px 0; }
            .result { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; 
                     padding: 20px; margin: 20px 0; }
            .movie-preview { background: #1a1a1a; color: white; padding: 20px; 
                           border-radius: 8px; margin: 20px 0; }
            pre { background: #1a1a1a; color: #00ff00; padding: 15px; border-radius: 5px; 
                  overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>🎬 Movie Data Scraper</h1>
          <p>Enter your Rwanda Cinema website URL to automatically extract movie data.</p>
          
          <div class="input-group">
            <input type="url" id="websiteUrl" 
                   placeholder="https://rwandacinema.site/comedy/nyaxo-comedy-baryamanye-kubera-perime"
                   value="https://rwandacinema.site/comedy/nyaxo-comedy-baryamanye-kubera-perime">
            <button onclick="scrapeMovie()">Scrape Movie Data</button>
          </div>
          
          <div id="loading" class="loading">⏳ Scraping website and extracting data...</div>
          
          <div id="result" class="result"></div>
          
          <script>
            async function scrapeMovie() {
              const url = document.getElementById('websiteUrl').value.trim();
              if (!url) {
                alert('Please enter a website URL');
                return;
              }
              
              const loading = document.getElementById('loading');
              const result = document.getElementById('result');
              
              loading.style.display = 'block';
              result.innerHTML = '';
              
              try {
                // Call our API to scrape the website
                const response = await fetch('/api/scrape', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ url: url })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  // Show the extracted data
                  result.innerHTML = \`
                    <h3>✅ Data Extracted Successfully!</h3>
                    <div class="movie-preview">
                      <h4>🎥 \${data.movieData.title || 'Movie'}</h4>
                      <p><strong>YouTube URL:</strong> <a href="\${data.movieData.videoUrl}" target="_blank">\${data.movieData.videoUrl}</a></p>
                      <p><strong>Category:</strong> \${data.movieData.category}</p>
                      <p><strong>Duration:</strong> \${data.movieData.duration}</p>
                      <p><strong>Language:</strong> \${data.movieData.language}</p>
                      <p><strong>Quality:</strong> \${data.movieData.quality}</p>
                    </div>
                    
                    <h4>📋 Full Extracted Data:</h4>
                    <pre>\${JSON.stringify(data.movieData, null, 2)}</pre>
                    
                    <button onclick="saveMovie()" style="background:#10b981;">💾 Save to GitHub</button>
                    
                    <div id="saveResult"></div>
                  \`;
                  
                  // Store movie data for saving
                  window.currentMovieData = data.movieData;
                } else {
                  result.innerHTML = \`
                    <h3>❌ Error</h3>
                    <p>\${data.error || 'Failed to extract data'}</p>
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                  \`;
                }
                
              } catch (error) {
                result.innerHTML = \`
                  <h3>❌ Error</h3>
                  <p>\${error.message}</p>
                \`;
              } finally {
                loading.style.display = 'none';
              }
            }
            
            async function saveMovie() {
              if (!window.currentMovieData) {
                alert('No movie data to save. Please scrape first.');
                return;
              }
              
              const saveResult = document.getElementById('saveResult');
              saveResult.innerHTML = 'Saving to GitHub...';
              
              try {
                const response = await fetch('/api/save', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ 
                    movieData: window.currentMovieData 
                  })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  saveResult.innerHTML = \`
                    <div style="background:#10b98120; padding:10px; border-radius:5px;">
                      <h4>✅ Saved Successfully!</h4>
                      <p>File: \${data.filePath}</p>
                      <p>Videos in file: \${data.videoCount}</p>
                      \${data.githubUrl ? \`<p><a href="\${data.githubUrl}" target="_blank">View on GitHub</a></p>\` : ''}
                    </div>
                  \`;
                } else {
                  saveResult.innerHTML = \`
                    <div style="background:#ef444420; padding:10px; border-radius:5px;">
                      <h4>❌ Save Failed</h4>
                      <p>\${data.error}</p>
                    </div>
                  \`;
                }
                
              } catch (error) {
                saveResult.innerHTML = \`
                  <div style="background:#ef444420; padding:10px; border-radius:5px;">
                    <h4>❌ Error</h4>
                    <p>\${error.message}</p>
                  </div>
                \`;
              }
            }
            
            // Auto-scrape example URL on page load
            window.addEventListener('load', () => {
              // Optional: Auto-scrape the example URL
              // scrapeMovie();
            });
          </script>
        </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }
    
    // API endpoint to scrape website
    if (pathname === '/api/scrape') {
      return handleScrape(request, env);
    }
    
    // API endpoint to save to GitHub
    if (pathname === '/api/save') {
      return handleSave(request, env);
    }
    
    // Simple API test endpoint
    if (pathname === '/api/test') {
      return new Response(JSON.stringify({
        status: 'ok',
        message: 'API is working'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
};

// Handle website scraping
async function handleScrape(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { url } = await request.json();
    
    if (!url) {
      return new Response(JSON.stringify({
        success: false,
        error: 'URL is required'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`Scraping: ${url}`);
    
    // Fetch the website
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to fetch URL (HTTP ${response.status})`
      }), { 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const html = await response.text();
    
    // Extract movie data
    const movieData = extractMovieData(html, url);
    
    return new Response(JSON.stringify({
      success: true,
      url: url,
      movieData: movieData
    }), { 
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle saving to GitHub
async function handleSave(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { movieData } = await request.json();
    
    if (!movieData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Movie data is required'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if GitHub credentials are set
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return new Response(JSON.stringify({
        success: false,
        error: 'GitHub credentials not configured'
      }), { 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate channel slug from category
    const channelSlug = (movieData.category || 'general').toLowerCase().replace(/\s+/g, '-');
    const jsonFileNumber = await getJsonFileNumber(channelSlug, env);
    const jsonFileName = `video-${jsonFileNumber}.json`;
    const jsonFilePath = `channels/${channelSlug}/${jsonFileName}`;
    
    // Get existing file or create new
    let videosArray = [];
    let sha = null;
    
    try {
      const existing = await getGitHubFile(jsonFilePath, env);
      videosArray = JSON.parse(existing.content);
      sha = existing.sha;
      console.log(`Loaded ${videosArray.length} existing videos`);
    } catch (error) {
      console.log('Creating new JSON file');
    }
    
    // Add the new movie
    const movieWithId = {
      ...movieData,
      id: 'movie_' + Date.now(),
      savedAt: new Date().toISOString()
    };
    
    videosArray.unshift(movieWithId);
    
    // Limit to 100 videos per file
    if (videosArray.length > 100) {
      videosArray = videosArray.slice(0, 100);
    }
    
    // Save to GitHub
    const jsonContent = JSON.stringify(videosArray, null, 2);
    const saveResult = await saveToGitHub(jsonFilePath, jsonContent, env, sha);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Movie saved successfully',
      filePath: jsonFilePath,
      videoCount: videosArray.length,
      githubUrl: saveResult.content?.html_url,
      movie: movieWithId
    }), { 
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Save error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Extract movie data from HTML
function extractMovieData(html, url) {
  const result = {
    title: null,
    releaseYear: new Date().getFullYear().toString(),
    duration: null,
    language: 'Kinyarwanda',
    category: 'general',
    rating: 'G',
    quality: 'HD',
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
    date: new Date().toISOString(),
    sourceUrl: url
  };
  
  try {
    // 1. Extract YouTube embed URL
    const youtubeEmbedMatch = html.match(/https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (youtubeEmbedMatch) {
      result.videoUrl = youtubeEmbedMatch[0];
      result.youtubeId = youtubeEmbedMatch[1];
      result.posterUrl = `https://img.youtube.com/vi/${youtubeEmbedMatch[1]}/maxresdefault.jpg`;
    }
    
    // 2. Extract title from Open Graph or title tag
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
    if (ogTitleMatch) {
      result.title = ogTitleMatch[1]
        .replace(/\s*\|\s*Watch Online.*$/i, '')
        .replace(/\s*-\s*Rwanda Cinema$/i, '')
        .trim();
    }
    
    // Fallback to regular title tag
    if (!result.title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        result.title = titleMatch[1]
          .replace(/\s*\|\s*Watch Online.*$/i, '')
          .replace(/\s*-\s*Rwanda Cinema$/i, '')
          .trim();
      }
    }
    
    // 3. Extract description
    const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
    if (ogDescMatch) {
      result.description = ogDescMatch[1].trim();
      result.metaDescription = ogDescMatch[1].trim();
    }
    
    // 4. Extract data from video-stats section (your website format)
    const statsPatterns = {
      duration: /<span[^>]*class="[^"]*stat[^"]*"[^>]*>⏱️\s*([^<]+)<\/span>/i,
      language: /<span[^>]*class="[^"]*stat[^"]*"[^>]*>🗣️\s*([^<]+)<\/span>/i,
      quality: /<span[^>]*class="[^"]*stat[^"]*"[^>]*>🎬\s*([^<]+)<\/span>/i,
      rating: /<span[^>]*class="[^"]*stat[^"]*"[^>]*>⭐\s*([^<]+)<\/span>/i,
      year: /<span[^>]*class="[^"]*stat[^"]*"[^>]*>📅\s*([^<]+)<\/span>/i
    };
    
    for (const [key, pattern] of Object.entries(statsPatterns)) {
      const match = html.match(pattern);
      if (match) {
        if (key === 'year') {
          result.releaseYear = match[1].trim();
        } else {
          result[key] = match[1].trim();
        }
      }
    }
    
    // 5. Extract main cast
    const castMatch = html.match(/<div[^>]*class="[^"]*cast-item[^"]*"[^>]*>\s*<strong>Main Cast<\/strong>\s*<p>([^<]+)<\/p>/i);
    if (castMatch) {
      result.mainCast = castMatch[1].trim();
    }
    
    // 6. Extract category from URL
    const categoryMatch = url.match(/\/(comedy|drama|action|romance|thriller|horror|series)\//i);
    if (categoryMatch) {
      result.category = categoryMatch[1].toLowerCase();
    }
    
    // 7. Generate slug
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
    
    // 8. Extract date from meta tag
    const dateMatch = html.match(/<meta[^>]*property="video:release_date"[^>]*content="([^"]*)"[^>]*>/i);
    if (dateMatch) {
      result.date = dateMatch[1];
    }
    
  } catch (error) {
    console.error('Error extracting data:', error);
  }
  
  return result;
}

// Helper: Get next JSON file number
async function getJsonFileNumber(channelSlug, env) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/contents/channels/${channelSlug}`,
      {
        headers: {
          'Authorization': `token ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Rwanda-Cinema'
        }
      }
    );
    
    if (response.ok) {
      const files = await response.json();
      const jsonFiles = files.filter(f => f.name.startsWith('video-') && f.name.endsWith('.json'));
      
      if (jsonFiles.length === 0) return 1;
      
      const latestFile = jsonFiles.sort((a, b) => {
        const aNum = parseInt(a.name.match(/video-(\d+)\.json/)?.[1] || '0');
        const bNum = parseInt(b.name.match(/video-(\d+)\.json/)?.[1] || '0');
        return bNum - aNum;
      })[0];
      
      try {
        const fileContent = await getGitHubFile(`channels/${channelSlug}/${latestFile.name}`, env);
        const videos = JSON.parse(fileContent.content);
        
        if (videos.length < 100) {
          const match = latestFile.name.match(/video-(\d+)\.json/);
          return match ? parseInt(match[1]) : 1;
        } else {
          const match = latestFile.name.match(/video-(\d+)\.json/);
          return match ? parseInt(match[1]) + 1 : 1;
        }
      } catch (e) {
        return 1;
      }
    }
  } catch (e) {
    // Channel doesn't exist
  }
  
  return 1;
}

// Helper: Get file from GitHub
async function getGitHubFile(path, env) {
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`,
    {
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Rwanda-Cinema'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`GitHub file not found: ${path}`);
  }
  
  const data = await response.json();
  const content = atob(data.content.replace(/\n/g, ''));
  
  return {
    content: content,
    sha: data.sha
  };
}

// Helper: Save to GitHub
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
        'User-Agent': 'Rwanda-Cinema'
      },
      body: JSON.stringify({
        message: `Add movie: ${path.split('/').pop()}`,
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
