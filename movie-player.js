// movie-player.js - Fully SEO Optimized
class MoviePlayer {
    constructor() {
        this.movieData = null;
        this.init();
    }

    async init() {
        await this.loadMovieFromURL();
    }

    async loadMovieFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        const slug = urlParams.get('slug');

        if (!category || !slug) {
            this.showError('Movie parameters missing');
            return;
        }

        const moviePath = `/content/movies/${category}/${slug}.md`;

        try {
            const response = await fetch(moviePath);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - File not found`);
            }

            const markdownContent = await response.text();
            this.movieData = this.parseMovieData(markdownContent);
            this.setupGlobalSEO(); // Set SEO before rendering
            this.renderMoviePlayer();
            
        } catch (error) {
            console.error('Error loading movie:', error);
            this.showError(`Cannot load movie: ${error.message}`);
        }
    }

    parseMovieData(markdownContent) {
        const frontMatterMatch = markdownContent.match(/^---\n([\s\S]*?)\n---/);
        if (!frontMatterMatch) {
            throw new Error('Invalid movie format');
        }

        const frontMatter = frontMatterMatch[1];
        const data = {};
        
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

    setupGlobalSEO() {
        // Update document title
        document.title = `${this.movieData.title} - Rwanda Cinema | Rwandan Movies`;

        // Remove existing meta tags to avoid duplicates
        this.removeExistingMetaTags();

        // Create all required meta tags
        this.createMetaTags();
        
        // Create structured data (JSON-LD)
        this.createStructuredData();
        
        // Create canonical URL
        this.createCanonicalLink();
    }

    removeExistingMetaTags() {
        const tagsToRemove = [
            'meta[name="description"]',
            'meta[property="og:title"]',
            'meta[property="og:description"]',
            'meta[property="og:image"]',
            'meta[property="og:url"]',
            'meta[name="twitter:title"]',
            'meta[name="twitter:description"]',
            'meta[name="twitter:image"]',
            'meta[name="twitter:card"]',
            'link[rel="canonical"]',
            'script[type="application/ld+json"]'
        ];

        tagsToRemove.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.remove();
        });
    }

    createMetaTags() {
        const metaTags = [
            // Basic SEO
            { name: 'description', content: this.movieData.metaDescription || this.movieData.description },
            { name: 'keywords', content: this.generateKeywords() },
            
            // Open Graph (Facebook)
            { property: 'og:title', content: this.movieData.title },
            { property: 'og:description', content: this.movieData.metaDescription || this.movieData.description },
            { property: 'og:image', content: this.movieData.posterUrl },
            { property: 'og:url', content: window.location.href },
            { property: 'og:type', content: 'video.movie' },
            { property: 'og:site_name', content: 'Rwanda Cinema' },
            { property: 'og:video:duration', content: this.extractMinutes(this.movieData.duration) },
            
            // Twitter Card
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:title', content: this.movieData.title },
            { name: 'twitter:description', content: this.movieData.metaDescription || this.movieData.description },
            { name: 'twitter:image', content: this.movieData.posterUrl },
            { name: 'twitter:site', content: '@RwandaCinema' },
            
            // Additional SEO
            { name: 'robots', content: 'index, follow, max-image-preview:large' },
            { name: 'author', content: 'Rwanda Cinema' }
        ];

        metaTags.forEach(tag => {
            const meta = document.createElement('meta');
            if (tag.property) {
                meta.setAttribute('property', tag.property);
            } else {
                meta.setAttribute('name', tag.name);
            }
            meta.setAttribute('content', tag.content);
            document.head.appendChild(meta);
        });
    }

    createStructuredData() {
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "Movie",
            "name": this.movieData.title,
            "description": this.movieData.description,
            "image": this.movieData.posterUrl,
            "dateCreated": this.movieData.date,
            "duration": this.movieData.duration,
            "contentRating": this.movieData.rating,
            "inLanguage": this.movieData.language,
            "genre": this.movieData.category,
            "actor": this.parseCast(this.movieData.mainCast),
            "director": this.movieData.director ? { "@type": "Person", "name": this.movieData.director } : undefined,
            "productionCompany": this.movieData.producer ? { "@type": "Organization", "name": this.movieData.producer } : undefined,
            "url": window.location.href,
            "potentialAction": {
                "@type": "WatchAction",
                "target": this.movieData.videoUrl
            }
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(structuredData);
        document.head.appendChild(script);
    }

    createCanonicalLink() {
        const link = document.createElement('link');
        link.rel = 'canonical';
        link.href = window.location.href;
        document.head.appendChild(link);
    }

    generateKeywords() {
        const baseKeywords = [
            'Rwandan movies',
            'Rwanda cinema',
            'Kinyarwanda films',
            'African movies',
            'streaming Rwanda',
            this.movieData.category,
            this.movieData.language,
            ...(this.movieData.tags || [])
        ].join(', ');
        
        return baseKeywords;
    }

    extractMinutes(duration) {
        const match = duration.match(/(\d+)\s*min/);
        return match ? parseInt(match[1]) * 60 : 1800; // Default 30 minutes
    }

    parseCast(castString) {
        if (!castString) return [];
        return castString.split(',').map(actor => ({
            "@type": "Person",
            "name": actor.trim()
        }));
    }

    renderMoviePlayer() {
        document.body.innerHTML = `
            <!-- Schema.org Breadcrumb -->
            <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://inyarwanda-films.pages.dev"
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "${this.movieData.category}",
                        "item": "https://inyarwanda-films.pages.dev/?category=${this.movieData.category}"
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": "${this.movieData.title}"
                    }
                ]
            }
            </script>

            <header style="background:#008753; padding:1rem; position:sticky; top:0; z-index:1000;">
                <div style="max-width:1200px; margin:0 auto; display:flex; justify-content:space-between; align-items:center;">
                    <a href="/" style="color:white; text-decoration:none; font-size:1.5rem; font-weight:bold;">
                        🎬 Rwanda Cinema
                    </a>
                    <nav aria-label="Breadcrumb">
                        <a href="/" style="color:white; text-decoration:none;">Home</a>
                        <span style="color:#FAD201; margin:0 0.5rem;">›</span>
                        <a href="/?category=${this.movieData.category}" style="color:white; text-decoration:none;">${this.movieData.category}</a>
                        <span style="color:#FAD201; margin:0 0.5rem;">›</span>
                        <span style="color:#FAD201;">${this.movieData.title}</span>
                    </nav>
                </div>
            </header>

            <main style="max-width:1200px; margin:0 auto; padding:2rem;">
                <article itemscope itemtype="https://schema.org/Movie">
                    <meta itemprop="url" content="${window.location.href}">
                    
                    <div class="video-container" style="background:#000; border-radius:8px; overflow:hidden; margin-bottom:2rem;">
                        ${this.renderVideoPlayer()}
                    </div>
                    
                    <div class="movie-info" style="display:grid; grid-template-columns:300px 1fr; gap:2rem;">
                        <div itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
                            <img src="${this.movieData.posterUrl}" 
                                 alt="${this.movieData.title} - Rwandan ${this.movieData.category} movie"
                                 itemprop="contentUrl"
                                 style="width:100%; border-radius:8px;">
                            <meta itemprop="url" content="${this.movieData.posterUrl}">
                        </div>
                        
                        <div>
                            <h1 itemprop="name" style="color:white; margin-bottom:1rem; font-size:2rem;">
                                ${this.movieData.title}
                            </h1>
                            
                            <div style="display:flex; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap;">
                                <span itemprop="dateCreated" style="background:#008753; color:white; padding:0.3rem 0.8rem; border-radius:15px;">
                                    ${this.movieData.releaseYear}
                                </span>
                                <span itemprop="duration" style="background:#FAD201; color:#000; padding:0.3rem 0.8rem; border-radius:15px;">
                                    ${this.movieData.duration}
                                </span>
                                <span itemprop="inLanguage" style="background:#00A1DE; color:white; padding:0.3rem 0.8rem; border-radius:15px;">
                                    ${this.movieData.language}
                                </span>
                                <span itemprop="contentRating" style="background:#6c757d; color:white; padding:0.3rem 0.8rem; border-radius:15px;">
                                    ${this.movieData.rating}
                                </span>
                            </div>
                            
                            <p itemprop="description" style="color:#ccc; line-height:1.6; margin-bottom:1.5rem;">
                                ${this.movieData.description}
                            </p>
                            
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; background:#1a1a1a; padding:1.5rem; border-radius:8px;">
                                <div>
                                    <strong style="color:#FAD201;">Category:</strong>
                                    <p itemprop="genre" style="color:white; margin:0.5rem 0 0 0;">${this.movieData.category}</p>
                                </div>
                                <div>
                                    <strong style="color:#FAD201;">Quality:</strong>
                                    <p style="color:white; margin:0.5rem 0 0 0;">${this.movieData.quality}</p>
                                </div>
                                ${this.movieData.director ? `
                                <div>
                                    <strong style="color:#FAD201;">Director:</strong>
                                    <p itemprop="director" style="color:white; margin:0.5rem 0 0 0;">${this.movieData.director}</p>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </article>
            </main>

            <footer style="background:#1a1a1a; padding:2rem; text-align:center; margin-top:3rem;">
                <p style="color:#ccc;">&copy; 2024 Rwanda Cinema. All rights reserved.</p>
            </footer>
        `;
    }

    renderVideoPlayer() {
        const videoUrl = this.movieData.videoUrl;
        
        if (videoUrl.includes('odysee.com')) {
            return `
                <iframe 
                    width="100%" 
                    height="500" 
                    src="${videoUrl}" 
                    frameborder="0" 
                    allowfullscreen
                    style="display:block;"
                    title="Watch ${this.movieData.title}">
                </iframe>
            `;
        }
        
        return `
            <div style="padding: 2rem; text-align: center; background: #000;">
                <a href="${videoUrl}" target="_blank" rel="noopener"
                   style="background: #008753; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 5px; display: inline-block;">
                   🎬 Watch "${this.movieData.title}"
                </a>
                <p style="color: #ccc; margin-top: 1rem;">${videoUrl}</p>
            </div>
        `;
    }

    showError(message) {
        document.body.innerHTML = `
            <header style="background:#008753; padding:1rem;">
                <a href="/" style="color:white; text-decoration:none; font-size:1.5rem; font-weight:bold;">🎬 Rwanda Cinema</a>
            </header>
            <main style="max-width:800px; margin:2rem auto; text-align:center; padding:2rem;">
                <h1 style="color:#FAD201; margin-bottom:1rem;">Error</h1>
                <p style="color:#ccc; margin-bottom:2rem;">${message}</p>
                <a href="/" style="background:#008753; color:white; padding:1rem 2rem; text-decoration:none; border-radius:5px;">
                    Back to Home
                </a>
            </main>
        `;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new MoviePlayer();
});
