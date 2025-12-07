// _worker.js - Enhanced to scrape your website and extract YouTube links
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        // Main endpoint to scrape website and create movie data
        if (pathname === '/api/scrape-movie') {
            return handleScrapeMovie(request, env);
        }
        
        // Simple dashboard for testing
        if (pathname === '/' || pathname === '/scrape.html') {
            return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Movie Data Scraper</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 50px; }
                        .container { max-width: 800px; margin: 0 auto; }
                        input { width: 100%; padding: 12px; margin: 10px 0; font-size: 16px; }
                        button { background: #4f46e5; color: white; border: none; padding: 12px 24px; cursor: pointer; }
                        .result { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; }
                        .preview { background: #1a1a1a; color: white; padding: 20px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🎬 Scrape Movie Data from Your Website</h1>
                        <p>Enter your website URL (like rwandacinema.site pages) to extract movie data and save to JSON</p>
                        
                        <div>
                            <input type="url" id="websiteUrl" 
                                   placeholder="https://rwandacinema.site/comedy/nyaxo-comedy-baryamanye-kubera-perime">
                            <button onclick="scrapeMovie()">Scrape & Save Movie Data</button>
                        </div>
                        
                        <div id="loading" style="display: none;">Scraping website...</div>
                        
                        <div id="preview" class="preview" style="display: none;">
                            <h3>Extracted Data Preview:</h3>
                            <pre id="previewData"></pre>
                        </div>
                        
                        <div id="result" class="result"></div>
                    </div>
                    
                    <script>
                        async function scrapeMovie() {
                            const url = document.getElementById('websiteUrl').value;
                            if (!url) {
                                alert('Please enter a website URL');
                                return;
                            }
                            
                            const loading = document.getElementById('loading');
                            const result = document.getElementById('result');
                            const preview = document.getElementById('preview');
                            const previewData = document.getElementById('previewData');
                            
                            loading.style.display = 'block';
                            result.innerHTML = '';
                            preview.style.display = 'none';
                            
                            try {
                                const response = await fetch('/api/scrape-movie', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ url: url })
                                });
                                
                                const data = await response.json();
                                
                                // Show preview
                                if (data.success && data.movieData) {
                                    preview.style.display = 'block';
                                    previewData.textContent = JSON.stringify(data.movieData, null, 2);
                                }
                                
                                // Show result
                                result.innerHTML = `
                                    <h3>${data.success ? '✅ Success!' : '❌ Error'}</h3>
                                    <p>${data.message}</p>
                                    ${data.filePath ? `<p><strong>Saved to:</strong> ${data.filePath}</p>` : ''}
                                    ${data.youtubeUrl ? `<p><strong>YouTube URL found:</strong> ${data.youtubeUrl}</p>` : ''}
                                    ${data.error ? `<p style="color: red;"><strong>Error:</strong> ${data.error}</p>` : ''}
                                `;
                                
                            } catch (error) {
                                result.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
                            } finally {
                                loading.style.display = 'none';
                            }
                        }
                    </script>
                </body>
                </html>
            `, {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        return new Response('Not found', { status: 404 });
    }
};

// Main function to scrape website and create movie data
async function handleScrapeMovie(request, env) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    try {
        const data = await request.json();
        const { url } = data;
        
        if (!url) {
            return new Response(JSON.stringify({
                success: false,
                message: 'URL is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        console.log(`Scraping URL: ${url}`);
        
        // Step 1: Scrape the website
        const scrapedData = await scrapeWebsiteData(url);
        
        if (!scrapedData.success) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Failed to scrape website',
                error: scrapedData.error
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Step 2: Extract YouTube URL and other data
        const extractedData = extractMovieData(scrapedData.html, url);
        
        if (!extractedData.youtubeId) {
            return new Response(JSON.stringify({
                success: false,
                message: 'No YouTube video found on the page',
                scrapedTitle: extractedData.title
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Step 3: Format data in your exact structure
        const movieData = formatMovieData(extractedData);
        
        // Step 4: Generate slug for filename
        const slug = extractedData.slug || generateSlug(extractedData.title);
        const channelSlug = extractedData.category || 'movies';
        
        // Step 5: Determine JSON file number
        const jsonFileNumber = await getJsonFileNumber(channelSlug, env);
        const jsonFileName = `video-${jsonFileNumber}`;
        const jsonFilePath = `channels/${channelSlug}/${jsonFileName}.json`;
        
        // Step 6: Get existing JSON or create new
        let videosArray = [];
        let sha = null;
        
        try {
            const existing = await getGitHubFile(jsonFilePath, env);
            videosArray = JSON.parse(existing.content);
            sha = existing.sha;
            console.log(`Loaded ${videosArray.length} videos from ${jsonFilePath}`);
        } catch (e) {
            console.log(`Creating new JSON file: ${jsonFilePath}`);
        }
        
        // Step 7: Add movie to array
        videosArray.unshift(movieData);
        
        // Step 8: Limit to 100 videos per file
        let nextFileNumber = jsonFileNumber;
        if (videosArray.length > 100) {
            videosArray = videosArray.slice(0, 100);
            nextFileNumber = jsonFileNumber + 1;
        }
        
        // Step 9: Save to GitHub
        const jsonContent = JSON.stringify(videosArray, null, 2);
        const saveResult = await saveToGitHub(jsonFilePath, jsonContent, env, sha);
        
        // Step 10: Update channel index
        await updateChannelIndex(extractedData.channelName || extractedData.category || 'Movies', 
                               channelSlug, movieData, env);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Movie data scraped and saved successfully',
            movieData: movieData,
            filePath: jsonFilePath,
            youtubeUrl: extractedData.youtubeEmbedUrl,
            scrapedData: {
                title: extractedData.title,
                category: extractedData.category,
                duration: extractedData.duration,
                language: extractedData.language,
                quality: extractedData.quality,
                rating: extractedData.rating,
                year: extractedData.year
            },
            saveResult: {
                url: saveResult.content?.html_url,
                count: videosArray.length
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
    } catch (error) {
        console.error('Error scraping movie:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Error processing request',
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

// Function to scrape website data
async function scrapeWebsiteData(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://google.com/'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        
        return {
            success: true,
            html: html,
            url: url,
            status: response.status
        };
        
    } catch (error) {
        console.error('Error scraping website:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Function to extract movie data from HTML
function extractMovieData(html, url) {
    const result = {
        url: url,
        youtubeId: null,
        youtubeEmbedUrl: null,
        title: null,
        description: null,
        category: null,
        duration: null,
        language: null,
        quality: null,
        rating: null,
        year: null,
        slug: null,
        channelName: null,
        mainCast: null,
        supportingCast: null,
        director: null,
        producer: null,
        tags: [],
        date: new Date().toISOString()
    };
    
    try {
        // Extract YouTube ID from embed URL in the page
        // Looking for patterns like: https://www.youtube.com/embed/aoCJdTzuZj0
        const youtubeEmbedMatch = html.match(/https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        if (youtubeEmbedMatch) {
            result.youtubeId = youtubeEmbedMatch[1];
            result.youtubeEmbedUrl = youtubeEmbedMatch[0];
        }
        
        // Also check for other YouTube URL patterns
        if (!result.youtubeId) {
            const youtubeUrlMatch = html.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
            if (youtubeUrlMatch) {
                result.youtubeId = youtubeUrlMatch[1];
                result.youtubeEmbedUrl = `https://www.youtube.com/embed/${youtubeUrlMatch[1]}`;
            }
        }
        
        // Extract title from meta tags
        const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
        if (ogTitleMatch) {
            result.title = ogTitleMatch[1].replace(/\s*\|\s*Watch Online.*$/i, '').trim();
        }
        
        // Fallback to regular title tag
        if (!result.title) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) {
                result.title = titleMatch[1].replace(/\s*\|\s*Watch Online.*$/i, '').trim();
            }
        }
        
        // Extract description
        const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
        if (ogDescMatch) {
            result.description = ogDescMatch[1].trim();
        }
        
        // Extract category from URL or meta tags
        const urlCategoryMatch = url.match(/\/(comedy|drama|action|romance|thriller|horror)\//i);
        if (urlCategoryMatch) {
            result.category = urlCategoryMatch[1].toLowerCase();
        }
        
        // Extract duration from video meta tag
        const durationMatch = html.match(/<meta[^>]*property="video:duration"[^>]*content="([^"]*)"[^>]*>/i);
        if (durationMatch) {
            const minutes = parseInt(durationMatch[1]);
            result.duration = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        
        // Look for duration in video-stats section (from your HTML example)
        const durationRegex = /<span[^>]*class="[^"]*stat[^"]*"[^>]*>⏱️\s*([^<]+)<\/span>/i;
        const durationFromStats = html.match(durationRegex);
        if (durationFromStats) {
            result.duration = durationFromStats[1].trim();
        }
        
        // Extract language
        const languageRegex = /<span[^>]*class="[^"]*stat[^"]*"[^>]*>🗣️\s*([^<]+)<\/span>/i;
        const languageMatch = html.match(languageRegex);
        if (languageMatch) {
            result.language = languageMatch[1].trim();
        }
        
        // Extract quality
        const qualityRegex = /<span[^>]*class="[^"]*stat[^"]*"[^>]*>🎬\s*([^<]+)<\/span>/i;
        const qualityMatch = html.match(qualityRegex);
        if (qualityMatch) {
            result.quality = qualityMatch[1].trim();
        }
        
        // Extract rating
        const ratingRegex = /<span[^>]*class="[^"]*stat[^"]*"[^>]*>⭐\s*([^<]+)<\/span>/i;
        const ratingMatch = html.match(ratingRegex);
        if (ratingMatch) {
            result.rating = ratingMatch[1].trim();
        }
        
        // Extract year
        const yearRegex = /<span[^>]*class="[^"]*stat[^"]*"[^>]*>📅\s*([^<]+)<\/span>/i;
        const yearMatch = html.match(yearRegex);
        if (yearMatch) {
            result.year = yearMatch[1].trim();
        }
        
        // Extract main cast from cast-crew section
        const mainCastRegex = /<div[^>]*class="[^"]*cast-item[^"]*"[^>]*>\s*<strong>Main Cast<\/strong>\s*<p>([^<]+)<\/p>/i;
        const mainCastMatch = html.match(mainCastRegex);
        if (mainCastMatch) {
            result.mainCast = mainCastMatch[1].trim();
        }
        
        // Extract slug from URL
        const slugMatch = url.match(/\/([^\/]+)$/);
        if (slugMatch) {
            result.slug = slugMatch[1];
        }
        
        // Extract date from meta tag
        const dateMatch = html.match(/<meta[^>]*property="video:release_date"[^>]*content="([^"]*)"[^>]*>/i);
        if (dateMatch) {
            result.date = dateMatch[1];
        }
        
        // Extract thumbnail URL
        const thumbnailRegex = /https:\/\/img\.youtube\.com\/vi\/[^"']+\/maxresdefault\.jpg/i;
        const thumbnailMatch = html.match(thumbnailRegex);
        if (thumbnailMatch) {
            result.thumbnail = thumbnailMatch[0];
        }
        
        // Parse Schema.org structured data if present
        const schemaMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
        if (schemaMatch) {
            try {
                const schemaData = JSON.parse(schemaMatch[1]);
                if (schemaData) {
                    if (!result.title && schemaData.name) result.title = schemaData.name;
                    if (!result.description && schemaData.description) result.description = schemaData.description;
                    if (!result.duration && schemaData.duration) {
                        // Convert ISO duration (PT35M) to readable format
                        const durMatch = schemaData.duration.match(/PT(\d+)M/);
                        if (durMatch) {
                            result.duration = `${durMatch[1]} minute${durMatch[1] !== '1' ? 's' : ''}`;
                        }
                    }
                    if (!result.rating && schemaData.contentRating) result.rating = schemaData.contentRating;
                    if (!result.language && schemaData.inLanguage) result.language = schemaData.inLanguage;
                    if (!result.date && schemaData.uploadDate) result.date = schemaData.uploadDate;
                }
            } catch (e) {
                console.log('Could not parse schema data:', e.message);
            }
        }
        
    } catch (error) {
        console.error('Error extracting data:', error);
    }
    
    return result;
}

// Function to format data in your exact structure
function formatMovieData(extractedData) {
    const now = new Date().toISOString();
    
    return {
        id: 'movie_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        title: extractedData.title || 'Unknown Title',
        releaseYear: extractedData.year || new Date().getFullYear().toString(),
        duration: extractedData.duration || 'Unknown',
        language: extractedData.language || 'Kinyarwanda',
        category: extractedData.category || 'general',
        rating: extractedData.rating || 'G',
        quality: extractedData.quality || 'HD',
        description: extractedData.description || extractedData.title || '',
        videoUrl: extractedData.youtubeEmbedUrl || '',
        posterUrl: extractedData.thumbnail || `https://img.youtube.com/vi/${extractedData.youtubeId}/maxresdefault.jpg`,
        director: extractedData.director || '',
        producer: extractedData.producer || '',
        mainCast: extractedData.mainCast || '',
        supportingCast: extractedData.supportingCast || '',
        metaDescription: extractedData.description || extractedData.title || '',
        tags: extractedData.tags || [],
        slug: extractedData.slug || generateSlug(extractedData.title),
        date: extractedData.date || now,
        channelName: extractedData.channelName || extractedData.category || 'Movies',
        channelSlug: (extractedData.category || 'movies').toLowerCase().replace(/\s+/g, '-'),
        youtubeId: extractedData.youtubeId,
        sourceUrl: extractedData.url,
        scrapedAt: now,
        
        // Markdown content (optional - can be generated)
        markdownContent: `# ${extractedData.title || 'Movie'}

${extractedData.description || ''}

## Movie Details

- **Release Year**: ${extractedData.year || 'Unknown'}
- **Duration**: ${extractedData.duration || 'Unknown'}
- **Language**: ${extractedData.language || 'Kinyarwanda'}
- **Category**: ${extractedData.category || 'general'}
- **Content Rating**: ${extractedData.rating || 'G'}
- **Quality**: ${extractedData.quality || 'HD'}

## Cast & Crew

${extractedData.mainCast ? `**Main Cast**: ${extractedData.mainCast}` : 'Not specified'}
${extractedData.supportingCast ? `\n**Supporting Cast**: ${extractedData.supportingCast}` : ''}
${extractedData.director ? `\n**Director**: ${extractedData.director}` : ''}
${extractedData.producer ? `\n**Producer**: ${extractedData.producer}` : ''}

## Watch Now

[Click here to watch "${extractedData.title || 'the movie'}"](https://www.youtube.com/embed/${extractedData.youtubeId})

---

*Uploaded on ${new Date().toLocaleDateString()}*`
    };
}

// Helper function to generate slug
function generateSlug(title) {
    if (!title) return 'unknown-movie';
    return title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
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

// Helper: Update channel index
async function updateChannelIndex(channelName, channelSlug, movieData, env) {
    const indexPath = 'channels/index.json';
    let indexData = { channels: [] };
    let sha = null;
    
    try {
        const existing = await getGitHubFile(indexPath, env);
        indexData = JSON.parse(existing.content);
        sha = existing.sha;
    } catch (e) {
        // Index doesn't exist, create new
    }
    
    let channelIndex = indexData.channels.findIndex(c => c.slug === channelSlug);
    
    const channelInfo = {
        name: channelName,
        slug: channelSlug,
        description: `${channelName} - Rwandan Movies`,
        totalVideos: 1,
        latestVideo: {
            title: movieData.title,
            url: movieData.videoUrl || movieData.sourceUrl || '',
            date: movieData.date,
            thumbnail: movieData.posterUrl
        },
        categories: [movieData.category],
        lastUpdated: new Date().toISOString(),
        created: new Date().toISOString()
    };
    
    if (channelIndex !== -1) {
        const existing = indexData.channels[channelIndex];
        indexData.channels[channelIndex] = {
            ...existing,
            totalVideos: existing.totalVideos + 1,
            latestVideo: channelInfo.latestVideo,
            categories: [...new Set([...existing.categories, movieData.category])],
            lastUpdated: new Date().toISOString()
        };
    } else {
        indexData.channels.push(channelInfo);
    }
    
    try {
        await saveToGitHub(indexPath, JSON.stringify(indexData, null, 2), env, sha);
    } catch (e) {
        console.warn('Failed to update index:', e.message);
    }
}
