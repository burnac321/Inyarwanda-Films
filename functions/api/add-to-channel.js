export async function onRequestPost(context) {
    const { request, env } = context;
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    try {
        const videoData = await request.json();
        
        // Validate required fields
        const requiredFields = ['channelName', 'title', 'videoUrl', 'thumbnail'];
        const missingFields = requiredFields.filter(field => !videoData[field]);
        
        if (missingFields.length > 0) {
            return new Response(JSON.stringify({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Generate channel slug
        const channelSlug = videoData.channelSlug || generateSlug(videoData.channelName);
        
        // 1. Update/Create channel index
        await updateChannelIndex(videoData, channelSlug, env);
        
        // 2. Add video to appropriate JSON file (creates new file every 200 videos)
        await addVideoToChannelJSON(videoData, channelSlug, env);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Video added to channel',
            channelSlug: channelSlug,
            channelUrl: `https://rwandacinema.site/channels/${channelSlug}`
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

async function updateChannelIndex(videoData, channelSlug, env) {
    const indexPath = `channels/index.json`;
    let indexData = { channels: [] };
    
    try {
        // Try to get existing index
        const response = await fetch(
            `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${indexPath}`,
            {
                headers: {
                    'Authorization': `token ${env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            const content = atob(data.content);
            indexData = JSON.parse(content);
        }
    } catch (e) {
        // Create new index
    }
    
    // Find or create channel entry
    let channelIndex = indexData.channels.findIndex(c => c.slug === channelSlug);
    
    const channelInfo = {
        name: videoData.channelName,
        slug: channelSlug,
        description: `${videoData.channelName} - Rwandan Content Channel`,
        category: videoData.category,
        thumbnail: videoData.thumbnail,
        totalVideos: 1,
        latestVideo: {
            title: videoData.title,
            url: videoData.videoUrl,
            date: videoData.uploadDate,
            thumbnail: videoData.thumbnail
        },
        lastUpdated: new Date().toISOString(),
        created: new Date().toISOString()
    };
    
    if (channelIndex !== -1) {
        // Update existing channel
        const existing = indexData.channels[channelIndex];
        indexData.channels[channelIndex] = {
            ...existing,
            ...channelInfo,
            totalVideos: existing.totalVideos + 1,
            lastUpdated: new Date().toISOString()
        };
    } else {
        // Add new channel
        indexData.channels.push(channelInfo);
    }
    
    // Save index
    await saveToGitHub(indexPath, JSON.stringify(indexData, null, 2), env);
}

async function addVideoToChannelJSON(videoData, channelSlug, env) {
    // Determine which JSON file to use (new file every 200 videos)
    const jsonNumber = await getNextJsonNumber(channelSlug, env);
    const jsonPath = `channels/${channelSlug}/videos-${jsonNumber}.json`;
    
    let videos = [];
    let sha = null;
    
    try {
        // Try to get existing JSON file
        const response = await fetch(
            `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${jsonPath}`,
            {
                headers: {
                    'Authorization': `token ${env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            const content = atob(data.content);
            videos = JSON.parse(content);
            sha = data.sha;
        }
    } catch (e) {
        // File doesn't exist, create new
    }
    
    // Add video to beginning (newest first)
    videos.unshift({
        id: videoData.id,
        title: videoData.title,
        description: videoData.description,
        url: videoData.videoUrl,
        duration: videoData.duration,
        quality: videoData.quality,
        category: videoData.category,
        releaseYear: videoData.releaseYear,
        thumbnail: videoData.thumbnail,
        youtubeId: videoData.youtubeId,
        views: videoData.views,
        likes: videoData.likes,
        uploadDate: videoData.uploadDate,
        channel: videoData.channelName,
        channelSlug: channelSlug
    });
    
    // If file has 200+ videos, create new file next time
    if (videos.length > 200) {
        videos = videos.slice(0, 200); // Keep only 200 in each file
    }
    
    // Save JSON file
    await saveToGitHub(jsonPath, JSON.stringify(videos, null, 2), env, sha);
}

async function getNextJsonNumber(channelSlug, env) {
    // Check existing files to determine next number
    try {
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
            
            // Get highest number
            const numbers = jsonFiles.map(f => {
                const match = f.name.match(/videos-(\d+)\.json/);
                return match ? parseInt(match[1]) : 0;
            });
            
            const maxNumber = Math.max(...numbers);
            
            // Check if latest file has less than 200 videos
            const latestFile = jsonFiles.find(f => f.name === `videos-${maxNumber}.json`);
            if (latestFile) {
                const fileResponse = await fetch(latestFile.download_url);
                const content = await fileResponse.json();
                if (content.length < 200) return maxNumber;
            }
            
            return maxNumber + 1;
        }
    } catch (e) {
        // Channel directory doesn't exist
    }
    
    return 1;
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
