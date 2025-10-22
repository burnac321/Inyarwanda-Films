export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const baseUrl = url.origin;
    const pathname = url.pathname;
    
    try {
        // Get all video slugs
        const allVideoSlugs = await getAllVideoSlugs(env);
        
        // Handle different sitemap requests
        if (pathname === '/sitemap.xml' || pathname === '/') {
            // Main sitemap or index
            return generateSitemap(allVideoSlugs, baseUrl, pathname);
        } else if (pathname.startsWith('/sitemap-')) {
            // Individual sitemap file (e.g., /sitemap-1.xml)
            return generateIndividualSitemap(allVideoSlugs, baseUrl, pathname);
        } else if (pathname === '/sitemap-categories.xml') {
            // Categories sitemap
            return generateCategoriesSitemap(allVideoSlugs, baseUrl);
        }
        
        return new Response('Sitemap not found', { status: 404 });
        
    } catch (error) {
        console.error('Sitemap generation error:', error);
        return new Response('Error generating sitemap', { status: 500 });
    }
}

function generateSitemap(allVideoSlugs, baseUrl, pathname) {
    const today = new Date().toISOString().split('T')[0];
    const MAX_URLS_PER_SITEMAP = 1000;
    
    // Count total URLs (homepage + categories + videos)
    const categories = [...new Set(allVideoSlugs.map(v => v.category).filter(Boolean))];
    const totalUrls = 1 + categories.length + allVideoSlugs.length;
    
    // If under limit, generate single sitemap
    if (totalUrls <= MAX_URLS_PER_SITEMAP) {
        return generateSingleSitemap(allVideoSlugs, baseUrl, today);
    }
    
    // If over limit, generate sitemap index
    return generateSitemapIndex(allVideoSlugs, baseUrl, today, MAX_URLS_PER_SITEMAP);
}

function generateSingleSitemap(allVideoSlugs, baseUrl, today) {
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Homepage
    sitemap += `
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${today}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>`;

    // Category pages
    const categories = [...new Set(allVideoSlugs.map(v => v.category).filter(Boolean))];
    categories.forEach(category => {
        sitemap += `
    <url>
        <loc>${baseUrl}/?category=${category}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
    });

    // Video pages
    allVideoSlugs.forEach(({ category, slug }) => {
        const videoUrl = `${baseUrl}/${category}/${slug}`;
        sitemap += `
    <url>
        <loc>${videoUrl}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`;
    });

    sitemap += '\n</urlset>';
    
    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=86400'
        }
    });
}

function generateSitemapIndex(allVideoSlugs, baseUrl, today, maxUrls) {
    const totalSitemaps = Math.ceil(allVideoSlugs.length / maxUrls);
    
    let sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>${baseUrl}/sitemap-categories.xml</loc>
        <lastmod>${today}</lastmod>
    </sitemap>`;
    
    for (let i = 1; i <= totalSitemaps; i++) {
        sitemapIndex += `
    <sitemap>
        <loc>${baseUrl}/sitemap-${i}.xml</loc>
        <lastmod>${today}</lastmod>
    </sitemap>`;
    }
    
    sitemapIndex += '\n</sitemapindex>';
    
    return new Response(sitemapIndex, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=86400'
        }
    });
}

function generateIndividualSitemap(allVideoSlugs, baseUrl, pathname) {
    const today = new Date().toISOString().split('T')[0];
    const MAX_URLS_PER_SITEMAP = 1000;
    
    // Extract sitemap number from pathname
    const match = pathname.match(/sitemap-(\d+)\.xml/);
    if (!match) {
        return new Response('Invalid sitemap', { status: 404 });
    }
    
    const sitemapNumber = parseInt(match[1]);
    const startIndex = (sitemapNumber - 1) * MAX_URLS_PER_SITEMAP;
    const endIndex = startIndex + MAX_URLS_PER_SITEMAP;
    const videoSlugs = allVideoSlugs.slice(startIndex, endIndex);
    
    if (videoSlugs.length === 0) {
        return new Response('Sitemap not found', { status: 404 });
    }
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    // Add video URLs for this chunk only
    videoSlugs.forEach(({ category, slug }) => {
        const videoUrl = `${baseUrl}/${category}/${slug}`;
        sitemap += `
    <url>
        <loc>${videoUrl}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`;
    });
    
    sitemap += '\n</urlset>';
    
    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=86400'
        }
    });
}

function generateCategoriesSitemap(allVideoSlugs, baseUrl) {
    const today = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${today}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>`;
    
    // Category pages only
    const categories = [...new Set(allVideoSlugs.map(v => v.category).filter(Boolean))];
    categories.forEach(category => {
        sitemap += `
    <url>
        <loc>${baseUrl}/?category=${category}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
    });
    
    sitemap += '\n</urlset>';
    
    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=86400'
        }
    });
}
