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
        
        // 1. Determine which JSON file to use (creates new file every 100 videos)
        const jsonFileNumber = await getNextJsonFileNumber(channelSlug, env);
        const jsonFilePath = `channels/${channelSlug}/videos-${jsonFileNumber}.json`;
        
        // 2. Get existing videos or create new array
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
        
        // 3. Create video object
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
        
        // 4. Add video to beginning of array (newest first)
        videos.unshift(videoObject);
        
        // 5. Limit to 100 videos per file (creates new file next time)
        let nextFileNumber = jsonFileNumber;
        if (videos.length > 100) {
            videos = videos.slice(0, 100);
            nextFileNumber = jsonFileNumber + 1;
        }
        
        // 6. Save to GitHub
        const saveResult = await saveToGitHub(jsonFilePath, JSON.stringify(videos, null, 2), env, sha);
        
        // 7. Update channel index
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

// Helper function to get next JSON file number
async function getNextJsonFileNumber(channelSlug, env) {
    try {
        // List files in channel directory
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
            
            // Get latest file and check if it has 100 videos
            const latestFile = jsonFiles.sort((a, b) => b.name.localeCompare(a.name))[0];
            const fileContent = await getGitHubFile(`channels/${channelSlug}/${latestFile.name}`, env);
            const videos = JSON.parse(fileContent.content);
            
            if (videos.length < 100) {
                // Use existing file
                const match = latestFile.name.match(/videos-(\d+)\.json/);
                return match ? parseInt(match[1]) : 1;
            } else {
                // Create new file
                const match = latestFile.name.match(/videos-(\d+)\.json/);
                return match ? parseInt(match[1]) + 1 : 1;
            }
        }
    } catch (e) {
        // Channel doesn't exist
    }
    
    return 1;
}

// Get file from GitHub
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

// Save to GitHub
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

// Update channel index
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
        // Add new
        indexData.channels.push(channelInfo);
    }
    
    // Save index
    await saveToGitHub(indexPath, JSON.stringify(indexData, null, 2), env, sha);
}

// Generate slug
function generateSlug(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}
