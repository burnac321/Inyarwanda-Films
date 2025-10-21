// movie-player.js - Dynamic movie player
class MoviePlayer {
    constructor() {
        this.movieData = null;
        this.relatedMovies = [];
        this.currentCategory = '';
        this.currentSlug = '';
        this.init();
    }

    async init() {
        await this.loadMovieFromURL();
        this.renderMoviePlayer();
        this.loadRelatedMovies();
        this.setupSEO();
    }

    async loadMovieFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentCategory = urlParams.get('category');
        this.currentSlug = urlParams.get('slug');

        if (!this.currentCategory || !this.currentSlug) {
            this.showError('Movie not found');
            return;
        }

        try {
            // Load movie markdown file
            const response = await fetch(`/content/movies/${this.currentCategory}/${this.currentSlug}.md`);
            
            if (!response.ok) {
                throw new Error('Movie not found');
            }

            const markdownContent = await response.text();
            this.movieData = this.parseMovieData(markdownContent);
            
        } catch (error) {
            console.error('Error loading movie:', error);
            this.showError('Failed to load movie');
        }
    }

    parseMovieData(markdownContent) {
        // Parse front matter from markdown
        const frontMatterMatch = markdownContent.match(/^---\n([\s\S]*?)\n---/);
        if (!frontMatterMatch) {
            throw new Error('Invalid movie format');
        }

        const frontMatter = frontMatterMatch[1];
        const data = {};
        
        // Parse YAML front matter
        frontMatter.split('\n').forEach(line => {
            const match = line.match(/(\w+):\s*(.*)/);
            if (match) {
                let [, key, value] = match;
                
                // Remove quotes if present
                value = value.replace(/^["'](.*)["']$/, '$1').trim();
                
                // Handle arrays (tags)
                if (key === 'tags' && value.startsWith('[')) {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = [];
                    }
                }
                
                // Handle numbers
                if (key === 'releaseYear') {
                    value = parseInt(value);
                }
                
                data[key] = value;
            }
        });

        return data;
    }

    renderMoviePlayer() {
        if (!this.movieData) {
            this.showError('Movie data not available');
            return;
        }

        document.title = `${this.movieData.title} - Rwanda Cinema`;

        document.body.innerHTML = `
            <header style="background:#008753; padding:1rem; position:sticky; top:0; z-index:1000;">
                <div style="max-width:1200px; margin:0 auto; display:flex; justify-content:space-between; align-items:center;">
                    <a href="/" style="color:white; text-decoration:none; font-size:1.5rem; font-weight:bold;">
                        🎬 Rwanda Cinema
                    </a>
                    <nav>
                        <a href="/" style="color:white; text-decoration:none; margin-left:1rem;">Home</a>
                        <a href="/?category=${this.movieData.category}" style="color:white; text-decoration:none; margin-left:1rem;">${this.movieData.category}</a>
                    </nav>
                </div>
            </header>

            <main style="max-width:1200px; margin:0 auto; padding:2rem;">
                <!-- Movie Player Section -->
                <section style="margin-bottom:3rem;">
                    <div class="video-container" style="background:#000; border-radius:8px; overflow:hidden; margin-bottom:2rem;">
                        ${this.renderVideoPlayer()}
                    </div>
                    
                    <div class="movie-info" style="display:grid; grid-template-columns:300px 1fr; gap:2rem;">
                        <!-- Poster -->
                        <div>
                            <img src="${this.movieData.posterUrl}" alt="${this.movieData.title}" 
                                 style="width:100%; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                        </div>
                        
                        <!-- Movie Details -->
                        <div>
                            <h1 style="color:white; margin-bottom:1rem; font-size:2rem;">${this.movieData.title}</h1>
                            
                            <div style="display:flex; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap;">
                                <span style="background:#008753; color:white; padding:0.3rem 0.8rem; border-radius:15px; font-size:0.9rem;">
                                    ${this.movieData.releaseYear}
                                </span>
                                <span style="background:#FAD201; color:#000; padding:0.3rem 0.8rem; border-radius:15px; font-size:0.9rem;">
                                    ${this.movieData.duration}
                                </span>
                                <span style="background:#00A1DE; color:white; padding:0.3rem 0.8rem; border-radius:15px; font-size:0.9rem;">
                                    ${this.movieData.quality}
                                </span>
                                <span style="background:#6c757d; color:white; padding:0.3rem 0.8rem; border-radius:15px; font-size:0.9rem;">
                                    ${this.movieData.rating}
                                </span>
                            </div>
                            
                            <p style="color:#ccc; line-height:1.6; margin-bottom:1.5rem;">${this.movieData.description}</p>
                            
                            <div class="movie-meta" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; background:#1a1a1a; padding:1.5rem; border-radius:8px;">
                                <div>
                                    <strong style="color:#FAD201;">Language:</strong>
                                    <p style="color:white; margin:0.5rem 0 0 0;">${this.movieData.language}</p>
                                </div>
                                <div>
                                    <strong style="color:#FAD201;">Category:</strong>
                                    <p style="color:white; margin:0.5rem 0 0 0;">${this.movieData.category}</p>
                                </div>
                                <div>
                                    <strong style="color:#FAD201;">Director:</strong>
                                    <p style="color:white; margin:0.5rem 0 0 0;">${this.movieData.director || 'Not specified'}</p>
                                </div>
                                <div>
                                    <strong style="color:#FAD201;">Cast:</strong>
                                    <p style="color:white; margin:0.5rem 0 0 0;">${this.movieData.mainCast || 'Not specified'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Related Movies -->
                <section>
                    <h2 style="color:#FAD201; margin-bottom:1.5rem; border-bottom:2px solid #008753; padding-bottom:0.5rem;">
                        More ${this.movieData.category} Movies
                    </h2>
                    <div id="related-movies" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:1.5rem;">
                        <div style="text-align:center; color:#ccc; padding:2rem;">
                            Loading related movies...
                        </div>
                    </div>
                </section>
            </main>

            <footer style="background:#1a1a1a; padding:2rem; text-align:center; margin-top:3rem;">
                <p style="color:#ccc;">&copy; 2024 Rwanda Cinema. All rights reserved.</p>
            </footer>
        `;
    }

    renderVideoPlayer() {
        const videoUrl = this.movieData.videoUrl;
        
        // Check if it's YouTube
        if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
            const videoId = this.extractYouTubeId(videoUrl);
            if (videoId) {
                return `
                    <iframe 
                        width="100%" 
                        height="600" 
                        src="https://www.youtube.com/embed/${videoId}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                        style="display:block;">
                    </iframe>
                `;
            }
        }
        
        // Check if it's Odysee
        if (videoUrl.includes('odysee.com')) {
            return `
                <iframe 
                    width="100%" 
                    height="600" 
                    src="${videoUrl.replace('https://odysee.com/', 'https://odysee.com/$/embed/')}" 
                    frameborder="0" 
                    allowfullscreen
                    style="display:block;">
                </iframe>
            `;
        }
        
        // Fallback to direct video
        return `
            <video 
                controls 
                width="100%" 
                height="600"
                poster="${this.movieData.posterUrl}"
                style="display:block;">
                <source src="${videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    }

    extractYouTubeId(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : false;
    }

    async loadRelatedMovies() {
        try {
            // Load all movies to find related ones
            const response = await fetch('/content/movies/movies.json');
            const allMovies = await response.json();
            
            // Filter movies from same category, excluding current movie
            this.relatedMovies = allMovies.filter(movie => 
                movie.category === this.movieData.category && 
                movie.slug !== this.movieData.slug
            ).slice(0, 6); // Show max 6 related movies
            
            this.renderRelatedMovies();
            
        } catch (error) {
            console.error('Error loading related movies:', error);
            this.renderRelatedMovies(); // Will show empty state
        }
    }

    renderRelatedMovies() {
        const container = document.getElementById('related-movies');
        
        if (!this.relatedMovies.length) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; color:#ccc; padding:2rem;">
                    No other movies found in this category yet.
                </div>
            `;
            return;
        }

        container.innerHTML = this.relatedMovies.map(movie => `
            <div class="related-movie-card" 
                 onclick="window.location.href='/movie.html?category=${movie.category}&slug=${movie.slug}'"
                 style="background:#1a1a1a; border-radius:8px; overflow:hidden; cursor:pointer; transition:transform 0.3s;">
                <img src="${movie.posterUrl}" alt="${movie.title}" 
                     style="width:100%; height:200px; object-fit:cover;">
                <div style="padding:1rem;">
                    <h3 style="color:white; font-size:1rem; margin-bottom:0.5rem; line-height:1.3;">
                        ${movie.title}
                    </h3>
                    <p style="color:#ccc; font-size:0.8rem; margin:0;">
                        ${movie.releaseYear} • ${movie.duration}
                    </p>
                </div>
            </div>
        `).join('');

        // Add hover effects
        const cards = container.querySelectorAll('.related-movie-card');
        cards.forEach(card => {
            card.onmouseenter = () => card.style.transform = 'scale(1.05)';
            card.onmouseleave = () => card.style.transform = 'scale(1)';
        });
    }

    setupSEO() {
        if (!this.movieData) return;

        // Update meta tags dynamically
        document.querySelector('meta[name="description"]')?.setAttribute('content', this.movieData.metaDescription || this.movieData.description);
        
        // Create Open Graph tags
        const ogTags = [
            { property: 'og:title', content: this.movieData.title },
            { property: 'og:description', content: this.movieData.metaDescription || this.movieData.description },
            { property: 'og:image', content: this.movieData.posterUrl },
            { property: 'og:url', content: window.location.href },
            { property: 'og:type', content: 'video.movie' }
        ];

        ogTags.forEach(tag => {
            let meta = document.querySelector(`meta[property="${tag.property}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('property', tag.property);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', tag.content);
        });

        // Add structured data
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "Movie",
            "name": this.movieData.title,
            "description": this.movieData.description,
            "image": this.movieData.posterUrl,
            "dateCreated": this.movieData.date,
            "duration": this.movieData.duration,
            "contentRating": this.movieData.rating,
            "inLanguage": this.movieData.language
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(structuredData);
        document.head.appendChild(script);
    }

    showError(message) {
        document.body.innerHTML = `
            <header style="background:#008753; padding:1rem;">
                <a href="/" style="color:white; text-decoration:none; font-size:1.5rem; font-weight:bold;">🎬 Rwanda Cinema</a>
            </header>
            <main style="max-width:800px; margin:2rem auto; text-align:center; padding:2rem;">
                <h1 style="color:#FAD201; margin-bottom:1rem;">Movie Not Found</h1>
                <p style="color:#ccc; margin-bottom:2rem;">${message}</p>
                <a href="/" style="background:#008753; color:white; padding:1rem 2rem; text-decoration:none; border-radius:5px;">
                    Back to Home
                </a>
            </main>
        `;
    }
}

// Initialize movie player when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MoviePlayer();
});
