export async function onRequestPost(context) {
    const { request, env } = context;
    
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
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Validate required fields
        if (!movieData.title || !movieData.category) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Missing required fields: title and category are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Generate markdown content
        const markdownContent = generateMarkdown(movieData);
        
        // Generate file path
        const fileName = `${movieData.slug || generateSlug(movieData.title)}.md`;
        const filePath = `content/movies/${movieData.category}/${fileName}`;
        
        // Encode content to base64
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
                headers: { 'Content-Type': 'application/json' }
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
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

function generateMarkdown(movieData) {
    return `---
title: "${escapeYaml(movieData.title)}"
releaseYear: ${movieData.releaseYear || 2024}
duration: "${escapeYaml(movieData.duration)}"
language: "${escapeYaml(movieData.language)}"
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
createdAt: "${new Date().toISOString()}"
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

- **Director**: ${movieData.director || 'Not specified'}
- **Producer**: ${movieData.producer || 'Not specified'}
- **Main Cast**: ${movieData.mainCast || 'Not specified'}
- **Supporting Cast**: ${movieData.supportingCast || 'Not specified'}

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
    return str.replace(/"/g, '\\"').replace(/\n/g, ' ');
                      }
