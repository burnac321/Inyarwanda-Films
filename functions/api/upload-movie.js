export async function onRequestPost(context) {
    const { request, env } = context;
    
    // Add CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }
    
    try {
        // Check if request has JSON body
        let movieData;
        try {
            movieData = await request.json();
        } catch (parseError) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Invalid JSON in request body'
            }), {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    ...corsHeaders 
                }
            });
        }
        
        // Validate required fields
        const requiredFields = ['title', 'category', 'videoUrl', 'posterUrl'];
        const missingFields = requiredFields.filter(field => !movieData[field]);
        
        if (missingFields.length > 0) {
            return new Response(JSON.stringify({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            }), {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    ...corsHeaders 
                }
            });
        }
        
        // Validate channelName is required
        if (!movieData.channelName) {
            return new Response(JSON.stringify({
                success: false,
                message: 'channelName is required to organize videos by channel'
            }), {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    ...corsHeaders 
                }
            });
        }
        
        // Generate channel slug from channel name
        const channelSlug = generateSlug(movieData.channelName);
        movieData.channelSlug = channelSlug;
        
        // Auto-generate slug if not provided
        if (!movieData.slug) {
            movieData.slug = generateSlug(movieData.title);
        }
        
        // Auto-generate meta description if not provided
        if (!movieData.metaDescription && movieData.description) {
            movieData.metaDescription = movieData.description.substring(0, 157) + '...';
        }
        
        // Set default meta title if not provided
        if (!movieData.metaTitle) {
            movieData.metaTitle = movieData.title;
        }
        
        // Ensure tags is an array
        if (!Array.isArray(movieData.tags)) {
            movieData.tags = movieData.tags ? movieData.tags.split(',').map(tag => tag.trim()) : [];
        }
        
        // Add default Rwandan tags if not present
        const defaultTags = ['rwanda', 'kinyarwanda', 'african-cinema'];
        defaultTags.forEach(tag => {
            if (!movieData.tags.includes(tag)) {
                movieData.tags.push(tag);
            }
        });
        
        // Add category and channel as tags if not present
        if (movieData.category && !movieData.tags.includes(movieData.category)) {
            movieData.tags.push(movieData.category);
        }
        
        if (channelSlug && !movieData.tags.includes(channelSlug)) {
            movieData.tags.push(channelSlug);
        }
        
        // Set upload timestamp
        const uploadDate = new Date().toISOString();
        movieData.uploadDate = uploadDate;
        
        // Generate markdown content
        const markdownContent = generateMarkdown(movieData);
        
        // Generate file path
        const fileName = `${movieData.slug}.md`;
        const filePath = movieData.category === 'music' 
            ? `content/music/${fileName}`
            : `content/movies/${movieData.category}/${fileName}`;
        
        // 1. Upload video markdown file
        await uploadToGitHub(filePath, markdownContent, movieData, env);
        
        // 2. Create/update channel JSON file
        const channelJsonPath = `content/channels/${channelSlug}/videos.json`;
        await updateChannelJsonFile(movieData, channelJsonPath, env);
        
        // 3. Create/update channel info file
        const channelInfoPath = `content/channels/${channelSlug}/channel.json`;
        await updateChannelInfoFile(movieData, channelInfoPath, env);
        
        // 4. Update main channels index
        await updateChannelsIndex(movieData, env);
        
        // Trigger GitHub Pages build
        await triggerGitHubPagesBuild(env);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Video uploaded successfully and channel updated',
            filePath: filePath,
            channelSlug: channelSlug,
            viewUrl: generateViewUrl(movieData),
            channelUrl: generateChannelUrl(channelSlug),
            seoStatus: 'optimized'
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders 
            }
        });
        
    } catch (error) {
        console.error('Function error:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders 
            }
        });
    }
}

async function uploadToGitHub(filePath, content, movieData, env) {
    const contentBase64 = btoa(unescape(encodeURIComponent(content)));
    
    const githubResponse = await fetch(
        `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${filePath}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Rwanda-Cinema-App'
            },
            body: JSON.stringify({
                message: `Add ${movieData.category}: ${movieData.title} to channel ${movieData.channelName}`,
                content: contentBase64,
                branch: 'main'
            })
        }
    );
    
    const result = await githubResponse.json();
    
    if (!githubResponse.ok) {
        if (result.message && result.message.includes('already exists')) {
            throw new Error('A video with this title already exists. Please use a different title or slug.');
        }
        throw new Error(result.message || `GitHub API error: ${githubResponse.status}`);
    }
    
    return result;
}

async function updateChannelJsonFile(movieData, channelJsonPath, env) {
    let existingVideos = [];
    let sha = null;
    
    try {
        // Try to get existing channel JSON file
        const existingResponse = await fetch(
            `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${channelJsonPath}`,
            {
                headers: {
                    'Authorization': `token ${env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Rwanda-Cinema-App'
                }
            }
        );
        
        if (existingResponse.ok) {
            const existingData = await existingResponse.json();
            const decodedContent = atob(existingData.content);
            existingVideos = JSON.parse(decodedContent);
            sha = existingData.sha;
        }
    } catch (error) {
        // File doesn't exist or is invalid, we'll create a new one
        console.log(`Creating new channel JSON file: ${channelJsonPath}`);
    }
    
    // Create video object for channel JSON
    const videoObject = {
        id: movieData.slug,
        title: movieData.title,
        description: movieData.description || '',
        metaDescription: movieData.metaDescription || '',
        duration: movieData.duration || '',
        releaseYear: movieData.releaseYear || new Date().getFullYear(),
        quality: movieData.quality || 'HD',
        category: movieData.category,
        thumbnail: movieData.posterUrl,
        videoUrl: movieData.videoUrl,
        youtubeVideoId: movieData.youtubeVideoId || '',
        channelName: movieData.channelName,
        channelSlug: movieData.channelSlug,
        uploadDate: movieData.uploadDate,
        lastUpdated: new Date().toISOString(),
        views: 0,
        likes: 0,
        tags: movieData.tags || []
    };
    
    // Check if video already exists in channel
    const existingIndex = existingVideos.findIndex(video => video.id === videoObject.id);
    
    if (existingIndex !== -1) {
        // Update existing video
        existingVideos[existingIndex] = {
            ...existingVideos[existingIndex],
            ...videoObject,
            lastUpdated: new Date().toISOString()
        };
    } else {
        // Add new video to beginning of array (newest first)
        existingVideos.unshift(videoObject);
    }
    
    // Sort videos by upload date (newest first)
    existingVideos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    
    // Limit to last 100 videos to keep file size manageable
    if (existingVideos.length > 100) {
        existingVideos = existingVideos.slice(0, 100);
    }
    
    const jsonContent = JSON.stringify(existingVideos, null, 2);
    const contentBase64 = btoa(unescape(encodeURIComponent(jsonContent)));
    
    const response = await fetch(
        `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${channelJsonPath}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Rwanda-Cinema-App'
            },
            body: JSON.stringify({
                message: `Update channel ${movieData.channelName}: Add video "${movieData.title}"`,
                content: contentBase64,
                branch: 'main',
                sha: sha // Include SHA if updating existing file
            })
        }
    );
    
    if (!response.ok) {
        const result = await response.json();
        throw new Error(`Failed to update channel JSON: ${result.message}`);
    }
}

async function updateChannelInfoFile(movieData, channelInfoPath, env) {
    let channelInfo = {
        name: movieData.channelName,
        slug: movieData.channelSlug,
        description: `${movieData.channelName} - Rwandan content channel`,
        website: '',
        youtubeUrl: '',
        socialMedia: {},
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalVideos: 1,
        categories: [movieData.category],
        featuredVideos: [],
        logo: movieData.posterUrl || '',
        banner: ''
    };
    
    let sha = null;
    
    try {
        // Try to get existing channel info
        const existingResponse = await fetch(
            `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${channelInfoPath}`,
            {
                headers: {
                    'Authorization': `token ${env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Rwanda-Cinema-App'
                }
            }
        );
        
        if (existingResponse.ok) {
            const existingData = await existingResponse.json();
            const decodedContent = atob(existingData.content);
            const existingInfo = JSON.parse(decodedContent);
            sha = existingData.sha;
            
            // Update existing info
            channelInfo = {
                ...existingInfo,
                name: movieData.channelName,
                lastUpdated: new Date().toISOString(),
                totalVideos: existingInfo.totalVideos + 1,
                categories: [...new Set([...existingInfo.categories, movieData.category])]
            };
        }
    } catch (error) {
        // Channel info doesn't exist, create new one
        console.log(`Creating new channel info file: ${channelInfoPath}`);
    }
    
    const jsonContent = JSON.stringify(channelInfo, null, 2);
    const contentBase64 = btoa(unescape(encodeURIComponent(jsonContent)));
    
    const response = await fetch(
        `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${channelInfoPath}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Rwanda-Cinema-App'
            },
            body: JSON.stringify({
                message: `Update channel info: ${movieData.channelName}`,
                content: contentBase64,
                branch: 'main',
                sha: sha
            })
        }
    );
    
    if (!response.ok) {
        const result = await response.json();
        console.warn(`Failed to update channel info: ${result.message}`);
        // This is non-critical, so don't fail the upload
    }
}

async function updateChannelsIndex(movieData, env) {
    const channelsIndexPath = 'content/channels/index.json';
    let channelsIndex = [];
    let sha = null;
    
    try {
        // Try to get existing channels index
        const existingResponse = await fetch(
            `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${channelsIndexPath}`,
            {
                headers: {
                    'Authorization': `token ${env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Rwanda-Cinema-App'
                }
            }
        );
        
        if (existingResponse.ok) {
            const existingData = await existingResponse.json();
            const decodedContent = atob(existingData.content);
            channelsIndex = JSON.parse(decodedContent);
            sha = existingData.sha;
        }
    } catch (error) {
        // Index doesn't exist, create new one
        console.log(`Creating new channels index: ${channelsIndexPath}`);
    }
    
    // Check if channel already exists in index
    const existingChannelIndex = channelsIndex.findIndex(channel => channel.slug === movieData.channelSlug);
    
    const channelData = {
        name: movieData.channelName,
        slug: movieData.channelSlug,
        description: `${movieData.channelName} - Rwandan content channel`,
        totalVideos: 1,
        latestVideo: {
            title: movieData.title,
            slug: movieData.slug,
            category: movieData.category,
            uploadDate: movieData.uploadDate,
            thumbnail: movieData.posterUrl
        },
        categories: [movieData.category],
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
    
    if (existingChannelIndex !== -1) {
        // Update existing channel
        const existingChannel = channelsIndex[existingChannelIndex];
        channelsIndex[existingChannelIndex] = {
            ...existingChannel,
            name: movieData.channelName,
            totalVideos: existingChannel.totalVideos + 1,
            latestVideo: channelData.latestVideo,
            categories: [...new Set([...existingChannel.categories, movieData.category])],
            lastUpdated: new Date().toISOString()
        };
    } else {
        // Add new channel to beginning of array
        channelsIndex.unshift(channelData);
    }
    
    // Sort channels by last updated (newest first)
    channelsIndex.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    
    // Limit to 100 channels
    if (channelsIndex.length > 100) {
        channelsIndex = channelsIndex.slice(0, 100);
    }
    
    const jsonContent = JSON.stringify(channelsIndex, null, 2);
    const contentBase64 = btoa(unescape(encodeURIComponent(jsonContent)));
    
    const response = await fetch(
        `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${channelsIndexPath}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Rwanda-Cinema-App'
            },
            body: JSON.stringify({
                message: `Update channels index: Add/update ${movieData.channelName}`,
                content: contentBase64,
                branch: 'main',
                sha: sha
            })
        }
    );
    
    if (!response.ok) {
        const result = await response.json();
        console.warn(`Failed to update channels index: ${result.message}`);
        // This is non-critical
    }
}

function generateMarkdown(movieData) {
    const currentDate = new Date().toISOString();
    const currentYear = new Date().getFullYear();
    
    return `---
title: "${escapeYaml(movieData.title)}"
metaTitle: "${escapeYaml(movieData.metaTitle || movieData.title)}"
releaseYear: ${movieData.releaseYear || currentYear}
duration: "${escapeYaml(movieData.duration || 'Not specified')}"
language: "${escapeYaml(movieData.language || 'Kinyarwanda')}"
category: "${escapeYaml(movieData.category)}"
rating: "${escapeYaml(movieData.rating || 'PG-13')}"
quality: "${escapeYaml(movieData.quality || '1080p')}"
description: "${escapeYaml(movieData.description || '')}"
metaDescription: "${escapeYaml(movieData.metaDescription || '')}"
videoUrl: "${escapeYaml(movieData.videoUrl)}"
posterUrl: "${escapeYaml(movieData.posterUrl)}"
youtubeVideoId: "${escapeYaml(movieData.youtubeVideoId || '')}"
youtubeChannel: "${escapeYaml(movieData.youtubeChannel || '')}"
youtubeThumbnail: "${escapeYaml(movieData.youtubeThumbnail || '')}"
channelName: "${escapeYaml(movieData.channelName)}"
channelSlug: "${escapeYaml(movieData.channelSlug)}"
director: "${escapeYaml(movieData.director || '')}"
producer: "${escapeYaml(movieData.producer || '')}"
mainCast: "${escapeYaml(movieData.mainCast || '')}"
supportingCast: "${escapeYaml(movieData.supportingCast || '')}"
keywords: "${escapeYaml(movieData.keywords || '')}"
focusKeyword: "${escapeYaml(movieData.focusKeyword || '')}"
tags: ${JSON.stringify(movieData.tags || [])}
slug: "${escapeYaml(movieData.slug)}"
uploadDate: "${currentDate}"
date: "${currentDate}"
lastUpdated: "${currentDate}"
seoOptimized: true
channelManaged: true
---

# ${movieData.metaTitle || movieData.title}

${movieData.description || ''}

**Channel**: [${movieData.channelName}](/channels/${movieData.channelSlug})

## Video Details

- **Release Year**: ${movieData.releaseYear || currentYear}
- **Duration**: ${movieData.duration || 'Not specified'}
- **Language**: ${movieData.language || 'Kinyarwanda'}
- **Category**: ${movieData.category}
- **Content Rating**: ${movieData.rating || 'PG-13'}
- **Quality**: ${movieData.quality || '1080p'}
- **Channel**: ${movieData.channelName}

## Watch Video

${
    movieData.youtubeVideoId 
    ? `<iframe width="100%" height="500" src="https://www.youtube.com/embed/${movieData.youtubeVideoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    : movieData.videoUrl.includes('youtube.com') || movieData.videoUrl.includes('youtu.be')
        ? `<iframe width="100%" height="500" src="${movieData.videoUrl.replace('watch?v=', 'embed/')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
        : `[Watch Now](${movieData.videoUrl})`
}

## More from ${movieData.channelName}

Check out more videos from [${movieData.channelName}](/channels/${movieData.channelSlug}) channel.

---

*Uploaded on ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
})}*

*Channel: ${movieData.channelName}*
`;
}

async function triggerGitHubPagesBuild(env) {
    try {
        await fetch(
            `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/pages/builds`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `token ${env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Rwanda-Cinema-App'
                }
            }
        );
        console.log('GitHub Pages build triggered');
    } catch (error) {
        console.warn('Failed to trigger GitHub Pages build:', error.message);
    }
}

function generateViewUrl(movieData) {
    const baseUrl = 'https://rwandacinema.site';
    if (movieData.category === 'music') {
        return `${baseUrl}/music/${movieData.slug}`;
    }
    return `${baseUrl}/${movieData.category}/${movieData.slug}`;
}

function generateChannelUrl(channelSlug) {
    return `https://rwandacinema.site/channels/${channelSlug}`;
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

function escapeYaml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/"/g, '\\"')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/\\/g, '\\\\');
}
