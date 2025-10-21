export async function onRequest(context) {
    try {
        const { request, env, params } = context;
        const { path } = params;
        
        // Check if this is a movie or music page request
        if (path && (path.startsWith('movies/') || path.startsWith('music/'))) {
            return handleMediaPage(context, path);
        }
        
        // For other paths, return 404 or handle differently
        return new Response('Not found', { status: 404 });
        
    } catch (error) {
        console.error('Error in path handler:', error);
        return new Response('Internal server error', { status: 500 });
    }
}

async function handleMediaPage(context, path) {
    const { env } = context;
    
    // Get markdown content from GitHub
    const mdContent = await getMarkdownContent(path, env);
    
    if (!mdContent) {
        return new Response('Media not found', { 
            status: 404,
            headers: { 'Content-Type': 'text/html' }
        });
    }

    // Parse markdown and extract metadata
    const mediaData = parseMarkdown(mdContent, path);
    
    // Get related posts (latest 2 from same category)
    const relatedPosts = await getRelatedPosts(path, env, mediaData.slug);
    
    // Generate SEO-friendly HTML page
    const html = generateMediaPage(mediaData, path, relatedPosts);
    
    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}

async function getMarkdownContent(path, env) {
    try {
        const owner = env.GITHUB_OWNER;
        const repo = env.GITHUB_REPO;
        const token = env.GITHUB_TOKEN;
        
        if (!owner || !repo || !token) {
            throw new Error('GitHub configuration missing');
        }

        // Updated path to include content directory
        const fullPath = `content/${path}`;
        
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'User-Agent': 'Rwanda-Cinema-App',
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.content) {
            const content = atob(data.content.replace(/\n/g, ''));
            return content;
        }

        return null;

    } catch (error) {
        console.error('Error fetching markdown content:', error);
        return null;
    }
}

async function getRelatedPosts(currentPath, env, currentSlug) {
    try {
        const owner = env.GITHUB_OWNER;
        const repo = env.GITHUB_REPO;
        const token = env.GITHUB_TOKEN;
        
        if (!owner || !repo || !token) {
            return [];
        }

        // Extract category from current path
        const category = currentPath.split('/')[0]; // movies or music
        
        // Updated path to include content directory
        const categoryPath = `content/${category}`;
        
        // Get all files in the category directory
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${categoryPath}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'User-Agent': 'Rwanda-Cinema-App',
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!response.ok) {
            return [];
        }

        const files = await response.json();
        
        // Filter markdown files and exclude current file
        const mdFiles = files.filter(file => 
            file.name.endsWith('.md') && 
            file.name.replace('.md', '') !== currentSlug
        );

        // Get the latest 2 files (sorted by commit date)
        const latestFiles = mdFiles.slice(0, 2);
        
        // Fetch content for each file to get metadata
        const relatedPosts = [];
        
        for (const file of latestFiles) {
            const content = await getMarkdownContent(`${category}/${file.name}`, env);
            if (content) {
                const postData = parseMarkdown(content, `${category}/${file.name}`);
                relatedPosts.push(postData);
            }
        }
        
        return relatedPosts;

    } catch (error) {
        console.error('Error fetching related posts:', error);
        return [];
    }
}

function parseMarkdown(mdContent, path) {
    const lines = mdContent.split('\n');
    const metadata = {};
    let content = '';
    let inFrontMatter = false;
    
    // Parse front matter (YAML format between ---)
    for (const line of lines) {
        if (line.trim() === '---') {
            inFrontMatter = !inFrontMatter;
            continue;
        }
        
        if (inFrontMatter) {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex > -1) {
                const key = line.slice(0, separatorIndex).trim();
                let value = line.slice(separatorIndex + 1).trim();
                
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                
                metadata[key] = value;
            }
        } else {
            content += line + '\n';
        }
    }
    
    // Extract slug from path
    const slug = path.split('/').pop().replace('.md', '');
    const category = path.split('/')[0];
    
    // Generate a readable title from slug if not provided
    let title = metadata.title;
    if (!title) {
        title = slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .replace(/[0-9]/g, '') // Remove numbers
            .replace(/\b(ep|comedy|rwandan)\b/gi, '') // Remove common words
            .replace(/\s+/g, ' ') // Clean up spaces
            .trim();
    }
    
    return {
        title: title || 'Untitled',
        description: metadata.description || content.substring(0, 160) + '...',
        releaseYear: metadata.releaseYear || new Date().getFullYear(),
        duration: metadata.duration || '',
        language: metadata.language || 'Kinyarwanda',
        rating: metadata.rating || 'G',
        quality: metadata.quality || '1080p',
        videoUrl: metadata.videoUrl || '',
        posterUrl: metadata.posterUrl || 'https://via.placeholder.com/400x600/008753/ffffff?text=No+Poster',
        director: metadata.director || '',
        producer: metadata.producer || '',
        mainCast: metadata.mainCast || '',
        tags: metadata.tags ? metadata.tags.split(',').map(tag => tag.trim()) : [],
        slug: slug,
        category: category,
        content: content.trim()
    };
}

function generateMediaPage(media, path, relatedPosts) {
    const isMusic = media.category === 'music';
    const pageTitle = isMusic 
        ? `${media.title} - Rwanda Music` 
        : `${media.title} (${media.releaseYear}) - Rwanda Cinema`;
    
    const metaDescription = media.description;
    
    // Generate structured data for SEO
    const structuredData = {
        "@context": "https://schema.org",
        "@type": isMusic ? "MusicComposition" : "Movie",
        "name": media.title,
        "description": media.description,
        "dateCreated": new Date().toISOString(),
        "inLanguage": media.language,
        "url": `https://inyarwanda-films.pages.dev/${path}`,
        "image": media.posterUrl
    };

    if (!isMusic) {
        structuredData["copyrightYear"] = media.releaseYear;
        structuredData["duration"] = media.duration;
        structuredData["contentRating"] = media.rating;
        structuredData["genre"] = media.category;
        structuredData["actor"] = media.mainCast ? media.mainCast.split(',').map(actor => actor.trim()) : [];
        if (media.director) {
            structuredData["director"] = { "@type": "Person", "name": media.director };
        }
        if (media.producer) {
            structuredData["producer"] = { "@type": "Person", "name": media.producer };
        }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(metaDescription)}">
    <meta name="keywords" content="${escapeHtml(media.tags.join(', '))}">
    
    <!-- Open Graph -->
    <meta property="og:type" content="${isMusic ? 'music.song' : 'video.movie'}">
    <meta property="og:title" content="${escapeHtml(media.title)}">
    <meta property="og:description" content="${escapeHtml(metaDescription)}">
    <meta property="og:image" content="${escapeHtml(media.posterUrl)}">
    <meta property="og:url" content="https://inyarwanda-films.pages.dev/${escapeHtml(path)}">
    <meta property="og:site_name" content="Rwanda ${isMusic ? 'Music' : 'Cinema'}">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(media.title)}">
    <meta name="twitter:description" content="${escapeHtml(metaDescription)}">
    <meta name="twitter:image" content="${escapeHtml(media.posterUrl)}">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify(structuredData)}
    </script>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        :root {
            --primary: #008753;
            --secondary: #FAD201;
            --accent: #00A1DE;
            --dark: #1a1a1a;
            --light: #f8f9fa;
            --gray: #6c757d;
        }
        
        body {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            color: var(--dark);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: var(--primary);
            color: white;
            padding: 2rem;
            text-align: center;
            border-radius: 15px 15px 0 0;
            margin-bottom: 2rem;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .header .category {
            background: var(--secondary);
            color: var(--dark);
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            display: inline-block;
            margin-top: 10px;
        }
        
        .media-content {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 3rem;
            margin-bottom: 2rem;
        }
        
        .poster-section img {
            width: 100%;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .video-player {
            width: 100%;
            border-radius: 10px;
            margin-bottom: 1rem;
        }
        
        .details-section h2 {
            color: var(--primary);
            margin-bottom: 1rem;
            font-size: 1.8rem;
        }
        
        .meta-info {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .meta-item {
            display: flex;
            flex-direction: column;
        }
        
        .meta-label {
            font-weight: bold;
            color: var(--gray);
            font-size: 0.9rem;
            margin-bottom: 0.25rem;
        }
        
        .meta-value {
            color: var(--dark);
            font-size: 1rem;
        }
        
        .description {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .cast-crew {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .cast-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 1rem;
        }
        
        .tag {
            background: var(--light);
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            color: var(--gray);
        }
        
        .back-button {
            display: inline-block;
            background: var(--primary);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            margin-bottom: 2rem;
            transition: background 0.3s;
        }
        
        .back-button:hover {
            background: #006641;
        }
        
        .related-posts {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            margin-top: 3rem;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .related-posts h2 {
            color: var(--primary);
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
            border-bottom: 2px solid var(--secondary);
            padding-bottom: 0.5rem;
        }
        
        .related-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        
        .related-card {
            background: var(--light);
            border-radius: 10px;
            overflow: hidden;
            transition: transform 0.3s, box-shadow 0.3s;
            text-decoration: none;
            color: inherit;
            display: block;
        }
        
        .related-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        
        .related-poster {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        
        .related-content {
            padding: 1rem;
        }
        
        .related-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: var(--dark);
        }
        
        .related-year {
            color: var(--gray);
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            .media-content {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .related-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="https://inyarwanda-films.pages.dev" class="back-button">← Back to Home</a>
        
        <div class="header">
            <h1>${escapeHtml(media.title)}</h1>
            ${!isMusic ? `<div class="release-year">${media.releaseYear}</div>` : ''}
            <div class="category">${escapeHtml(media.category.charAt(0).toUpperCase() + media.category.slice(1))}</div>
        </div>
        
        <div class="media-content">
            <div class="poster-section">
                <img src="${escapeHtml(media.posterUrl)}" alt="${escapeHtml(media.title)}" onerror="this.src='https://via.placeholder.com/400x600/008753/ffffff?text=Poster+Not+Found'">
            </div>
            
            <div class="details-section">
                ${media.videoUrl ? `
                <video class="video-player" controls poster="${escapeHtml(media.posterUrl)}">
                    <source src="${escapeHtml(media.videoUrl)}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                ` : ''}
                
                <div class="meta-info">
                    <h2>Details</h2>
                    <div class="meta-grid">
                        ${!isMusic ? `
                        <div class="meta-item">
                            <span class="meta-label">Duration</span>
                            <span class="meta-value">${escapeHtml(media.duration)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Content Rating</span>
                            <span class="meta-value">${escapeHtml(media.rating)}</span>
                        </div>
                        ` : ''}
                        <div class="meta-item">
                            <span class="meta-label">Language</span>
                            <span class="meta-value">${escapeHtml(media.language)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Quality</span>
                            <span class="meta-value">${escapeHtml(media.quality)}</span>
                        </div>
                    </div>
                    
                    ${media.tags && media.tags.length > 0 ? `
                    <div class="tags">
                        ${media.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                    ` : ''}
                </div>
                
                <div class="description">
                    <h2>Description</h2>
                    <p>${escapeHtml(media.content).replace(/\n/g, '<br>')}</p>
                </div>
                
                ${!isMusic && (media.director || media.producer || media.mainCast) ? `
                <div class="cast-crew">
                    <h2>Cast & Crew</h2>
                    <div class="cast-grid">
                        ${media.director ? `
                        <div class="meta-item">
                            <span class="meta-label">Director</span>
                            <span class="meta-value">${escapeHtml(media.director)}</span>
                        </div>
                        ` : ''}
                        ${media.producer ? `
                        <div class="meta-item">
                            <span class="meta-label">Producer</span>
                            <span class="meta-value">${escapeHtml(media.producer)}</span>
                        </div>
                        ` : ''}
                        ${media.mainCast ? `
                        <div class="meta-item">
                            <span class="meta-label">Main Cast</span>
                            <span class="meta-value">${escapeHtml(media.mainCast)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        
        ${relatedPosts.length > 0 ? `
        <div class="related-posts">
            <h2>Related ${media.category === 'movies' ? 'Movies' : 'Music'}</h2>
            <div class="related-grid">
                ${relatedPosts.map(post => `
                <a href="https://inyarwanda-films.pages.dev/${post.category}/${post.slug}.md" class="related-card">
                    <img src="${escapeHtml(post.posterUrl)}" alt="${escapeHtml(post.title)}" class="related-poster" onerror="this.src='https://via.placeholder.com/300x200/008753/ffffff?text=No+Poster'">
                    <div class="related-content">
                        <div class="related-title">${escapeHtml(post.title)}</div>
                        ${!isMusic ? `<div class="related-year">${post.releaseYear}</div>` : ''}
                    </div>
                </a>
                `).join('')}
            </div>
        </div>
        ` : ''}
    </div>
    
    <script>
        // Auto-play video when it comes into viewport
        const video = document.querySelector('video');
        if (video) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        video.play();
                    } else {
                        video.pause();
                    }
                });
            });
            observer.observe(video);
        }
    </script>
</body>
</html>`;
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
                }
