// _worker.js - Put this in the ROOT of your project
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        // ===== API ENDPOINTS =====
        
        // 1. Add video to channel JSON (your main endpoint)
        if (pathname === '/api/add-to-channel-json') {
            return handleAddToChannelJson(request, env);
        }
        
        // 2. Get video info from website URL
        if (pathname === '/api/get-video-info') {
            return handleGetVideoInfo(request, env);
        }
        
        // 3. Simple test endpoint
        if (pathname === '/api/create-md') {
            return handleCreateMd(request, env);
        }
        
        // ===== STATIC FILES =====
        // This serves your HTML, CSS, JS files
        
        // Serve the upload form
        if (pathname === '/upload-channel.html' || pathname === '/upload') {
            return fetch(new URL('./upload-channel.html', request.url));
        }
        
        // Serve homepage
        if (pathname === '/' || pathname === '/index.html') {
            return fetch(new URL('./index.html', request.url));
        }
        
        // Serve other static files (CSS, JS, images)
        // If the file exists, serve it
        try {
            return await env.ASSETS.fetch(request);
        } catch (e) {
            // File not found
            return new Response('Page not found', { status: 404 });
        }
    }
};

// ===== API HANDLER FUNCTIONS =====

// 1. Main endpoint: Add video to channel JSON
async function handleAddToChannelJson(request, env) {
    // Add CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    // Only allow POST
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({
            success: false,
            message: 'Method not allowed'
        }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
    
    try {
        const data = await request.json();
        const { channelName, videoData } = data;
        
        if (!channelName || !videoData) {
            return new Response(JSON.stringify({
                success: false,
                message: 'channelName and videoData are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Generate channel slug
        const channelSlug = generateSlug(channelName);
        
        // Determine which JSON file to use
        const jsonFileNumber = await getNextJsonFileNumber(channelSlug, env);
        const jsonFilePath = `channels/${channelSlug}/videos-${jsonFileNumber}.json`;
        
        // Get existing videos or create new array
        let videos = [];
        let sha = null;
        
        try {
            const existing = await getGitHubFile(jsonFilePath, env);
            videos = JSON.parse(existing.content);
            sha = existing.sha;
        } catch (e) {
            // File doesn't exist, create new
            console.log('Creating new JSON file:', jsonFilePath);
        }
        
        // Create video object
        const videoObject = {
            id: `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: videoData.title || 'Video Title',
            description: videoData.description || '',
            category: videoData.category || 'general',
            duration: videoData.duration || '',
            quality: videoData.quality || 'HD',
            releaseYear: videoData.releaseYear || new Date().getFullYear(),
            websiteUrl: videoData.websiteUrl || '',
            youtubeId: videoData.youtubeId || '',
            channelName: channelName,
            channelSlug: channelSlug,
            thumbnail: videoData.thumbnail || '',
            views: 0,
            likes: 0,
            uploadDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        // Add video to beginning of array (newest first)
        videos.unshift(videoObject);
        
        // Limit to 100 videos per file
        let nextFileNumber = jsonFileNumber;
        if (videos.length > 100) {
            videos = videos.slice(0, 100);
            nextFileNumber = jsonFileNumber + 1;
        }
        
        // Save to GitHub
        const saveResult = await saveToGitHub(jsonFilePath, JSON.stringify(videos, null, 2), env, sha);
        
        // Update channel index
        await updateChannelIndex(channelName, channelSlug, videoObject, env);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Video added to channel JSON',
            channelSlug: channelSlug,
            jsonFile: jsonFilePath,
            videoCount: videos.length,
            nextFile: videos.length >= 100 ? `videos-${nextFileNumber}.json` : null,
            githubUrl: saveResult.content.html_url
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

// 2. Get video info from website URL
async function handleGetVideoInfo(request, env) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    try {
        const url = new URL(request.url);
        const websiteUrl = url.searchParams.get('url');
        
        if (!websiteUrl) {
            return new Response(JSON.stringify({
                success: false,
                message: 'URL parameter is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Parse the URL to get slug and category
        const urlObj = new URL(websiteUrl);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        
        if (pathParts.length < 2) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Invalid URL format. Should be: /category/video-slug'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        const category = pathParts[0];
        const slug = pathParts[1];
        const mdFilePath = `content/movies/${category}/${slug}.md`;
        
        // Try to get the MD file from GitHub
        try {
            const response = await fetch(
                `https://raw.githubusercontent.com/${env.GITHUB_REPO}/main/${mdFilePath}`,
                {
                    headers: {
                        'Authorization': `token ${env.GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3.raw'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('File not found on GitHub');
            }
            
            const mdContent = await response.text();
            
            // Parse frontmatter from MD file
            const frontmatter = parseFrontmatter(mdContent);
            
            return new Response(JSON.stringify({
                success: true,
                videoData: {
                    title: frontmatter.title || 'Unknown Title',
                    description: frontmatter.description || '',
                    category: frontmatter.category || category,
                    duration: frontmatter.duration || '',
                    quality: frontmatter.quality || 'HD',
                    releaseYear: frontmatter.releaseYear || new Date().getFullYear(),
                    thumbnail: frontmatter.posterUrl || ''
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
            
        } catch (error) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Could not fetch video data: ' + error.message
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

// 3. Simple MD file creation test
async function handleCreateMd(request, env) {
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
        const { fileName, channelName, content } = data;
        
        if (!fileName || !channelName) {
            return new Response(JSON.stringify({
                success: false,
                message: 'fileName and channelName are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Create file path
        const filePath = `channels/${channelName}/${fileName}.md`;
        const mdContent = content || `# ${fileName}\n\nChannel: ${channelName}\n\nCreated: ${new Date().toISOString()}`;
        
        // Save to GitHub
        const result = await saveToGitHub(filePath, mdContent, env);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'MD file created',
            filePath: filePath,
            githubUrl: result.content.html_url
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

// ===== HELPER FUNCTIONS =====

async function getNextJsonFileNumber(channelSlug, env) {
    try {
        // Check if channel directory exists
        const response = await fetch(
            `https://api.github.com/repos/${env.GITHUB_REPO}/contents/channels/${channelSlug}`,
            {
                headers: {
                    'Authorization': `token ${env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        if (response.ok) {
            const files = await response.json();
            const jsonFiles = files.filter(f => f.name.startsWith('videos-') && f.name.endsWith('.json'));
            
            if (jsonFiles.length === 0) return 1;
            
            // Get latest file
            const latestFile = jsonFiles.sort((a, b) => b.name.localeCompare(a.name))[0];
            const fileContent = await getGitHubFile(`channels/${channelSlug}/${latestFile.name}`, env);
            const videos = JSON.parse(fileContent.content);
            
            if (videos.length < 100) {
                const match = latestFile.name.match(/videos-(\d+)\.json/);
                return match ? parseInt(match[1]) : 1;
            } else {
                const match = latestFile.name.match(/videos-(\d+)\.json/);
                return match ? parseInt(match[1]) + 1 : 1;
            }
        }
    } catch (e) {
        // Channel doesn't exist
    }
    
    return 1;
}

async function getGitHubFile(path, env) {
    const response = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`,
        {
            headers: {
                'Authorization': `token ${env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        }
    );
    
    if (!response.ok) throw new Error('File not found');
    
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update ${path}`,
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

async function updateChannelIndex(channelName, channelSlug, videoData, env) {
    const indexPath = 'channels/index.json';
    let indexData = { channels: [] };
    let sha = null;
    
    try {
        const existing = await getGitHubFile(indexPath, env);
        indexData = JSON.parse(existing.content);
        sha = existing.sha;
    } catch (e) {
        // Index doesn't exist
    }
    
    // Find or create channel entry
    let channelIndex = indexData.channels.findIndex(c => c.slug === channelSlug);
    
    const channelInfo = {
        name: channelName,
        slug: channelSlug,
        description: `${channelName} - Rwandan Content`,
        totalVideos: 1,
        latestVideo: {
            title: videoData.title,
            url: videoData.websiteUrl,
            date: videoData.uploadDate,
            thumbnail: videoData.thumbnail
        },
        categories: [videoData.category],
        lastUpdated: new Date().toISOString()
    };
    
    if (channelIndex !== -1) {
        const existing = indexData.channels[channelIndex];
        indexData.channels[channelIndex] = {
            ...existing,
            totalVideos: existing.totalVideos + 1,
            latestVideo: channelInfo.latestVideo,
            categories: [...new Set([...existing.categories, videoData.category])],
            lastUpdated: new Date().toISOString()
        };
    } else {
        indexData.channels.push(channelInfo);
    }
    
    await saveToGitHub(indexPath, JSON.stringify(indexData, null, 2), env, sha);
}

function generateSlug(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}

function parseFrontmatter(mdContent) {
    const frontmatter = {};
    
    // Simple frontmatter parsing
    const frontmatterMatch = mdContent.match(/^---\n([\s\S]*?)\n---/);
    
    if (frontmatterMatch) {
        const frontmatterText = frontmatterMatch[1];
        const lines = frontmatterText.split('\n');
        
        lines.forEach(line => {
            const match = line.match(/(\w+):\s*(.*)/);
            if (match) {
                let [, key, value] = match;
                value = value.replace(/^["'](.*)["']$/, '$1').trim();
                frontmatter[key] = value;
            }
        });
    }
    
    return frontmatter;
}
