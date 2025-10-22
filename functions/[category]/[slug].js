export async function onRequest(context) {
  const { request, params, env } = context;
  const { category, slug } = params;

  try {
    // All content is under movies/ directory
    const filePath = `content/movies/${category}/${slug}.md`;

    // Fetch the markdown file from your GitHub repo
    const GITHUB_RAW_URL = `https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/${filePath}`;
    
    const response = await fetch(GITHUB_RAW_URL);
    
    if (!response.ok) {
      return new Response('Content not found', { status: 404 });
    }

    const markdownContent = await response.text();
    const contentData = parseContentMarkdown(markdownContent, category, slug);

    // Generate the HTML page
    const html = generateContentPage(contentData);
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
      },
    });
  } catch (error) {
    return new Response('Error loading content', { status: 500 });
  }
}

function parseContentMarkdown(content, category, slug) {
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatterMatch) return null;

  const frontMatter = frontMatterMatch[1];
  const data = { category, slug };

  frontMatter.split('\n').forEach(line => {
    const match = line.match(/(\w+):\s*(.*)/);
    if (match) {
      let [, key, value] = match;
      value = value.replace(/^["'](.*)["']$/, '$1').trim();
      
      if (key === 'tags' && value.startsWith('[')) {
        try { value = JSON.parse(value); } catch (e) { value = []; }
      }
      if (key === 'releaseYear') value = parseInt(value);
      
      data[key] = value;
    }
  });

  return data;
}

function generateContentPage(contentData) {
  const pageUrl = `https://inyarwanda-films.pages.dev/${contentData.category}/${contentData.slug}`;
  
  return `<!DOCTYPE html>
<html lang="rw" itemscope itemtype="http://schema.org/WebPage">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>${escapeHTML(contentData.title)} - Inyarwanda Films</title>
    <meta name="description" content="${escapeHTML(contentData.metaDescription || contentData.description)}">
    <meta name="keywords" content="${generateKeywords(contentData)}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="video.movie">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${escapeHTML(contentData.title)} - Inyarwanda Films">
    <meta property="og:description" content="${escapeHTML(contentData.metaDescription || contentData.description)}">
    <meta property="og:image" content="${contentData.posterUrl}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${pageUrl}">
    <meta property="twitter:title" content="${escapeHTML(contentData.title)} - Inyarwanda Films">
    <meta property="twitter:description" content="${escapeHTML(contentData.metaDescription || contentData.description)}">
    <meta property="twitter:image" content="${contentData.posterUrl}">
    
    <style>
        :root {
            --primary: #008753;
            --secondary: #FAD201;
            --accent: #00A1DE;
            --dark: #0a0a0a;
            --card-bg: #1a1a1a;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: system-ui; }
        body { background: var(--dark); color: white; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
        .header { background: var(--primary); padding: 1rem 0; border-bottom: 3px solid var(--secondary); }
        .video-container { position: relative; padding-bottom: 56.25%; height: 0; background: #000; }
        .video-container video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <a href="/" style="color: white; text-decoration: none; font-size: 1.5rem; font-weight: bold;">
                🎬 Inyarwanda Films
            </a>
        </div>
    </header>

    <main class="container" style="padding: 2rem 0;">
        <h1>${escapeHTML(contentData.title)}</h1>
        <div class="video-container">
            <video controls poster="${contentData.posterUrl}" style="width: 100%; height: 100%;">
                <source src="${contentData.videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>
        <div style="margin-top: 2rem;">
            <p>${escapeHTML(contentData.description)}</p>
        </div>
    </main>
</body>
</html>`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, 
    tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    }[tag]));
}

function generateKeywords(contentData) {
  const base = ['Rwandan movies', 'Kinyarwanda films', 'Inyarwanda Films'];
  if (contentData.tags) base.push(...contentData.tags);
  return base.join(', ');
}
