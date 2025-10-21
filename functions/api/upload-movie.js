export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const movieData = await request.json();
        
        // Generate markdown content
        const markdownContent = generateMarkdown(movieData);
        
        // Generate file path
        const fileName = `${movieData.slug}.md`;
        const filePath = `content/movies/${movieData.category}/${fileName}`;
        
        // Create GitHub API request
        const githubResponse = await fetch(
            `https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${env.GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Add movie: ${movieData.title}`,
                    content: btoa(unescape(encodeURIComponent(markdownContent))),
                    branch: 'main'
                })
            }
        );
        
        const result = await githubResponse.json();
        
        if (githubResponse.ok) {
            return new Response(JSON.stringify({
                success: true,
                message: 'Movie uploaded successfully',
                url: result.content.html_url
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            throw new Error(result.message || 'GitHub API error');
        }
        
    } catch (error) {
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
title: "${movieData.title}"
releaseYear: ${movieData.releaseYear}
duration: "${movieData.duration}"
language: "${movieData.language}"
category: "${movieData.category}"
rating: "${movieData.rating}"
quality: "${movieData.quality}"
description: "${movieData.description}"
videoUrl: "${movieData.videoUrl}"
posterUrl: "${movieData.posterUrl}"
director: "${movieData.director}"
producer: "${movieData.producer}"
mainCast: "${movieData.mainCast}"
supportingCast: "${movieData.supportingCast}"
metaDescription: "${movieData.metaDescription}"
tags: ${JSON.stringify(movieData.tags)}
slug: "${movieData.slug}"
createdAt: "${movieData.createdAt}"
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

- **Director**: ${movieData.director}
- **Producer**: ${movieData.producer}
- **Main Cast**: ${movieData.mainCast}
- **Supporting Cast**: ${movieData.supportingCast}

## Watch Now

[Click here to watch "${movieData.title}"](${movieData.videoUrl})

---

*Uploaded on ${new Date(movieData.createdAt).toLocaleDateString()}*
`;
              }
