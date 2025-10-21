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
        
        // Generate markdown content
        const markdownContent = generateMarkdown(movieData);
        
        // Generate file path
        const fileName = `${movieData.slug || generateSlug(movieData.title)}.md`;
        const filePath = `content/movies/${movieData.category}/${fileName}`;
        
        // Encode content to base64 (UTF-8 safe)
        const contentBase64 = btoa(unescape(encodeURIComponent(markdownContent)));
        
        // Create GitHub API request
        const githubResponse = await fetch(
            `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Rwanda-Cinema-App'
                },
                body: JSON.stringify({
                    message: `Add movie: ${movieData.title}`,
                    content: contentBase64,
                    branch: 'main'
                })
            }
        );
        
        const result = await githubResponse.json();
        
        if (githubResponse.ok) {
            return new Response(JSON.stringify({
                success: true,
                message: 'Movie uploaded successfully',
                filePath: filePath,
                githubUrl: result.content.html_url
            }), {
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    ...corsHeaders 
                }
            });
        } else {
            console.error('GitHub API error:', result);
            throw new Error(result.message || `GitHub API error: ${githubResponse.status}`);
        }
        
    } catch (error) {
        console.error('Function error:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message
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
    const cast = [];
    if (movieData.director) cast.push(`- **Director**: ${movieData.director}`);
    if (movieData.producer) cast.push(`- **Producer**: ${movieData.producer}`);
    if (movieData.mainCast) cast.push(`- **Main Cast**: ${movieData.mainCast}`);
    if (movieData.supportingCast) cast.push(`- **Supporting Cast**: ${movieData.supportingCast}`);
    
    const castSection = cast.length > 0 ? cast.join('\n') : 'Not specified';

    return `---
title: "${escapeYaml(movieData.title)}"
releaseYear: ${movieData.releaseYear || 2024}
duration: "${escapeYaml(movieData.duration || 'Not specified')}"
language: "${escapeYaml(movieData.language || 'Kinyarwanda')}"
category: "${escapeYaml(movieData.category)}"
rating: "${escapeYaml(movieData.rating || 'PG')}"
quality: "${escapeYaml(movieData.quality || '1080p')}"
description: "${escapeYaml(movieData.description)}"
videoUrl: "${escapeYaml(movieData.videoUrl)}"
posterUrl: "${escapeYaml(movieData.posterUrl)}"
director: "${escapeYaml(movieData.director || '')}"
producer: "${escapeYaml(movieData.producer || '')}"
mainCast: "${escapeYaml(movieData.mainCast || '')}"
supportingCast: "${escapeYaml(movieData.supportingCast || '')}"
metaDescription: "${escapeYaml(movieData.metaDescription || movieData.description.substring(0, 157) + '...')}"
tags: ${JSON.stringify(movieData.tags || [])}
slug: "${escapeYaml(movieData.slug || generateSlug(movieData.title))}"
date: "${new Date().toISOString()}"
---

# ${movieData.title}

${movieData.description}

## Movie Details

- **Release Year**: ${movieData.releaseYear}
- **Duration**: ${movieData.duration}
- **Language**: ${movieData.language}
- **Category**: ${movieData.category}
- **Content Rating**: ${movieData.rating}
- **Quality**: ${movieData.quality}

## Cast & Crew

${castSection}

## Watch Now

[Click here to watch "${movieData.title}"](${movieData.videoUrl})

---

*Uploaded on ${new Date().toLocaleDateString()}*
`;
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function escapeYaml(str) {
    if (!str) return '';
    return str.toString().replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\r/g, '');
    }
