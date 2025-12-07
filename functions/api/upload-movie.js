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
        
        // Add category as tag if not present
        if (movieData.category && !movieData.tags.includes(movieData.category)) {
            movieData.tags.push(movieData.category);
        }
        
        // Add channel name as tag if present
        if (movieData.channelName) {
            const channelTag = movieData.channelName.toLowerCase().replace(/\s+/g, '-');
            if (!movieData.tags.includes(channelTag)) {
                movieData.tags.push(channelTag);
            }
        }
        
        // Generate markdown content with all new SEO fields
        const markdownContent = generateMarkdown(movieData);
        
        // Generate file path
        const fileName = `${movieData.slug}.md`;
        const filePath = movieData.category === 'music' 
            ? `content/music/${fileName}`
            : `content/movies/${movieData.category}/${fileName}`;
        
        // Encode content to base64 (UTF-8 safe)
        const contentBase64 = btoa(unescape(encodeURIComponent(markdownContent)));
        
        // Create GitHub API request
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
                    message: `Add ${movieData.category}: ${movieData.title}`,
                    content: contentBase64,
                    branch: 'main'
                })
            }
        );
        
        const result = await githubResponse.json();
        
        if (githubResponse.ok) {
            // Trigger GitHub Pages build
            await triggerGitHubPagesBuild(env);
            
            return new Response(JSON.stringify({
                success: true,
                message: 'Movie uploaded successfully',
                filePath: filePath,
                githubUrl: result.content.html_url,
                viewUrl: generateViewUrl(movieData),
                seoStatus: 'optimized'
            }), {
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    ...corsHeaders 
                }
            });
        } else {
            // Check if file already exists
            if (result.message && result.message.includes('already exists')) {
                return new Response(JSON.stringify({
                    success: false,
                    message: 'A movie with this title already exists. Please use a different title or slug.'
                }), {
                    status: 409,
                    headers: { 
                        'Content-Type': 'application/json',
                        ...corsHeaders 
                    }
                });
            }
            
            console.error('GitHub API error:', result);
            throw new Error(result.message || `GitHub API error: ${githubResponse.status}`);
        }
        
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

function generateMarkdown(movieData) {
    // Build cast section
    const cast = [];
    if (movieData.director) cast.push(`- **Director**: ${movieData.director}`);
    if (movieData.producer) cast.push(`- **Producer**: ${movieData.producer}`);
    if (movieData.mainCast) cast.push(`- **Main Cast**: ${movieData.mainCast}`);
    if (movieData.supportingCast) cast.push(`- **Supporting Cast**: ${movieData.supportingCast}`);
    
    const castSection = cast.length > 0 ? cast.join('\n') : 'Not specified';

    // Build YouTube specific info
    const youtubeInfo = [];
    if (movieData.youtubeVideoId) youtubeInfo.push(`youtubeVideoId: "${escapeYaml(movieData.youtubeVideoId)}"`);
    if (movieData.youtubeChannel) youtubeInfo.push(`youtubeChannel: "${escapeYaml(movieData.youtubeChannel)}"`);
    if (movieData.youtubeThumbnail) youtubeInfo.push(`youtubeThumbnail: "${escapeYaml(movieData.youtubeThumbnail)}"`);
    
    // Get current date for publication
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
metaDescription: "${escapeYaml(movieData.metaDescription || movieData.description?.substring(0, 157) + '...' || '')}"
videoUrl: "${escapeYaml(movieData.videoUrl)}"
posterUrl: "${escapeYaml(movieData.posterUrl)}"
${youtubeInfo.length > 0 ? youtubeInfo.join('\n') + '\n' : ''}director: "${escapeYaml(movieData.director || '')}"
producer: "${escapeYaml(movieData.producer || '')}"
mainCast: "${escapeYaml(movieData.mainCast || '')}"
supportingCast: "${escapeYaml(movieData.supportingCast || '')}"
channelName: "${escapeYaml(movieData.channelName || '')}"
keywords: "${escapeYaml(movieData.keywords || '')}"
focusKeyword: "${escapeYaml(movieData.focusKeyword || '')}"
tags: ${JSON.stringify(movieData.tags || [])}
slug: "${escapeYaml(movieData.slug)}"
date: "${currentDate}"
lastUpdated: "${currentDate}"
seoOptimized: true
---

# ${movieData.metaTitle || movieData.title}

${movieData.description || ''}

## Movie Details

- **Release Year**: ${movieData.releaseYear || currentYear}
- **Duration**: ${movieData.duration || 'Not specified'}
- **Language**: ${movieData.language || 'Kinyarwanda'}
- **Category**: ${movieData.category}
- **Content Rating**: ${movieData.rating || 'PG-13'}
- **Quality**: ${movieData.quality || '1080p'}
${movieData.channelName ? `- **Channel/Studio**: ${movieData.channelName}\n` : ''}

## Cast & Crew

${castSection}

## Video

${
    movieData.youtubeVideoId 
    ? `<iframe width="100%" height="500" src="https://www.youtube.com/embed/${movieData.youtubeVideoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    : movieData.videoUrl.includes('youtube.com') || movieData.videoUrl.includes('youtu.be')
        ? `<iframe width="100%" height="500" src="${movieData.videoUrl.replace('watch?v=', 'embed/')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
        : `[Watch Now](${movieData.videoUrl})`
}

## SEO Information

- **Meta Title**: ${movieData.metaTitle || movieData.title}
- **Meta Description**: ${movieData.metaDescription || ''}
- **Focus Keyword**: ${movieData.focusKeyword || 'Not specified'}
- **Keywords**: ${movieData.keywords || 'Not specified'}

## Tags

${(movieData.tags || []).map(tag => `- ${tag}`).join('\n')}

---

*Uploaded on ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
})}*

${movieData.youtubeChannel ? `*Source: ${movieData.youtubeChannel} YouTube Channel*` : ''}
`;
}

async function triggerGitHubPagesBuild(env) {
    try {
        // Trigger GitHub Pages build by making a dummy commit to the gh-pages branch
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
        // This is non-critical, so don't fail the upload
    }
}

function generateViewUrl(movieData) {
    const baseUrl = 'https://rwandacinema.site';
    if (movieData.category === 'music') {
        return `${baseUrl}/music/${movieData.slug}`;
    }
    return `${baseUrl}/${movieData.category}/${movieData.slug}`;
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50); // Limit slug length
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
