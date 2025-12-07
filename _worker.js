// _worker.js - Creates JSON files through /api/create-md
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        // Use the working endpoint but make it create JSON
        if (pathname === '/api/create-md') {
            return handleCreateChannelJson(request, env);
        }
        
        // Simple test page
        if (pathname === '/' || pathname === '/upload.html') {
            return new Response(`
                <html>
                <head>
                    <title>Channel JSON Upload</title>
                    <style>
                        body { font-family: Arial; margin: 50px; }
                        input, button { padding: 10px; margin: 5px; }
                        .result { margin: 20px; padding: 15px; background: #f5f5f5; }
                    </style>
                </head>
                <body>
                    <h1>Add Video to Channel JSON</h1>
                    
                    <div>
                        <input type="text" id="channel" placeholder="Channel name" style="width: 300px;"><br>
                        <input type="text" id="title" placeholder="Video title" style="width: 300px;"><br>
                        <input type="text" id="url" placeholder="Website URL" style="width: 300px;"><br>
                        <button onclick="addVideo()">Add to Channel JSON</button>
                    </div>
                    
                    <div id="result" class="result"></div>
                    
                    <script>
                        async function addVideo() {
                            const channel = document.getElementById('channel').value;
                            const title = document.getElementById('title').value;
                            const url = document.getElementById('url').value;
                            
                            if (!channel || !title) {
                                alert('Enter channel and title');
                                return;
                            }
                            
                            const resultDiv = document.getElementById('result');
                            resultDiv.innerHTML = 'Adding...';
                            
                            try {
                                // Create video data for JSON
                                const videoData = {
                                    channelName: channel,
                                    videoTitle: title,
                                    websiteUrl: url,
                                    description: "Video added via upload form",
                                    duration: "10:30",
                                    quality: "1080p",
                                    category: "comedy",
                                    releaseYear: 2024,
                                    thumbnail: "https://via.placeholder.com/300x200",
                                    views: 0,
                                    likes: 0
                                };
                                
                                // Generate file name
                                const fileName = channel.toLowerCase().replace(/\s+/g, '-') + '-videos';
                                
                                const response = await fetch('/api/create-md', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        fileName: fileName,
                                        channelName: channel,
                                        videoData: videoData  // We'll use this for JSON
                                    })
                                });
                                
                                const data = await response.json();
                                resultDiv.innerHTML = JSON.stringify(data, null, 2);
                            } catch (error) {
                                resultDiv.innerHTML = 'Error: ' + error.message;
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

// This endpoint now creates JSON files with video data
async function handleCreateChannelJson(request, env) {
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
        const { fileName, channelName, videoData } = data;
        
        if (!channelName) {
            return new Response(JSON.stringify({
                success: false,
                message: 'channelName is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Generate channel slug
        const channelSlug = channelName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        
        // Determine JSON file number (1, 2, 3, etc. for every 100 videos)
        const jsonFileNumber = await getJsonFileNumber(channelSlug, env);
        const jsonFileName = fileName || `videos-${jsonFileNumber}`;
        const jsonFilePath = `channels/${channelSlug}/${jsonFileName}.json`;
        
        // Get existing JSON or create new
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
        
        // Create video object
        const videoObject = {
            id: 'vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: videoData?.videoTitle || videoData?.title || 'Video Title',
            description: videoData?.description || '',
            category: videoData?.category || 'general',
            duration: videoData?.duration || '',
            quality: videoData?.quality || 'HD',
            releaseYear: videoData?.releaseYear || new Date().getFullYear(),
            websiteUrl: videoData?.websiteUrl || '',
            youtubeId: videoData?.youtubeId || '',
            channelName: channelName,
            channelSlug: channelSlug,
            thumbnail: videoData?.thumbnail || '',
            views: videoData?.views || 0,
            likes: videoData?.likes || 0,
            uploadDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        // Add to beginning (newest first)
        videosArray.unshift(videoObject);
        
        // Limit to 100 videos per file
        let nextFileNumber = jsonFileNumber;
        if (videosArray.length > 100) {
            videosArray = videosArray.slice(0, 100);
            nextFileNumber = jsonFileNumber + 1;
        }
        
        // Save JSON to GitHub
        const jsonContent = JSON.stringify(videosArray, null, 2);
        const saveResult = await saveToGitHub(jsonFilePath, jsonContent, env, sha);
        
        // Update channel index
        await updateChannelIndex(channelName, channelSlug, videoObject, env);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Video added to channel JSON',
            channelSlug: channelSlug,
            jsonFile: jsonFilePath,
            videoCount: videosArray.length,
            nextFile: videosArray.length >= 100 ? `videos-${nextFileNumber}.json` : null,
            githubUrl: saveResult.content?.html_url,
            videoAdded: videoObject
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message,
            errorType: error.constructor.name
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

// Helper: Get next JSON file number
async function getJsonFileNumber(channelSlug, env) {
    try {
        // Check if channel directory exists
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
            const jsonFiles = files.filter(f => f.name.startsWith('videos-') && f.name.endsWith('.json'));
            
            if (jsonFiles.length === 0) return 1;
            
            // Get latest file
            const latestFile = jsonFiles.sort((a, b) => b.name.localeCompare(a.name))[0];
            
            // Check if it has less than 100 videos
            try {
                const fileContent = await getGitHubFile(`channels/${channelSlug}/${latestFile.name}`, env);
                const videos = JSON.parse(fileContent.content);
                
                if (videos.length < 100) {
                    const match = latestFile.name.match(/videos-(\d+)\.json/);
                    return match ? parseInt(match[1]) : 1;
                } else {
                    const match = latestFile.name.match(/videos-(\d+)\.json/);
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

// Helper: Update channel index
async function updateChannelIndex(channelName, channelSlug, videoData, env) {
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
    
    // Find or create channel
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
        lastUpdated: new Date().toISOString(),
        created: new Date().toISOString()
    };
    
    if (channelIndex !== -1) {
        // Update existing
        const existing = indexData.channels[channelIndex];
        indexData.channels[channelIndex] = {
            ...existing,
            totalVideos: existing.totalVideos + 1,
            latestVideo: channelInfo.latestVideo,
            categories: [...new Set([...existing.categories, videoData.category])],
            lastUpdated: new Date().toISOString()
        };
    } else {
        // Add new channel
        indexData.channels.push(channelInfo);
    }
    
    // Save index
    try {
        await saveToGitHub(indexPath, JSON.stringify(indexData, null, 2), env, sha);
    } catch (e) {
        console.warn('Failed to update index:', e.message);
        // Don't fail the whole process if index update fails
    }
}
