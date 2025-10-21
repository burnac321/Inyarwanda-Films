// movie-player.js - Improved version with better layout and video player
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
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = [];
                    }
                }
                
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
            <style>
                /* Improved responsive styles */
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 1rem;
                }
                
                .video-wrapper {
                    position: relative;
                    width: 100%;
                    background: #000;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    margin-bottom: 2rem;
                }
                
                .video-wrapper iframe,
                .video-wrapper video {
                    width: 100%;
                    height: 67.5vh; /* 16:9 aspect ratio */
                    min-height: 400px;
                    max-height: 720px;
                    display: block;
                    border: none;
                }
                
                .movie-layout {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2rem;
                }
                
                @media (min-width: 1024px) {
                    .movie-layout {
                        grid-template-columns: 350px 1fr;
                    }
                }
                
                .poster-section img {
                    width: 100%;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }
                
                .details-section {
                    color: white;
                }
                
                .movie-title {
                    font-size: 2.5rem;
                    font-weight: bold;
                    margin-bottom: 1rem;
                    line-height: 1.2;
                    color: white;
                }
                
                .movie-badges {
                    display: flex;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                }
                
                .badge {
                    padding: 0.5rem 1rem;
                    border-radius: 25px;
                    font-size: 0.9rem;
                    font-weight: 600;
                }
                
                .movie-description {
                    font-size: 1.1rem;
                    line-height: 1.6;
                    color: #e0e0e0;
                    margin-bottom: 2rem;
                }
                
                .movie-meta-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                    background: #1a1a1a;
                    padding: 2rem;
                    border-radius: 12px;
                    border: 1px solid #333;
                }
                
                .meta-item strong {
                    color: #FAD201;
                    display: block;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                }
                
                .meta-item p {
                    color: white;
                    margin: 0;
                    font-size: 1rem;
                }
                
                .related-section {
                    margin-top: 3rem;
                }
                
                .section-title {
                    font-size: 1.8rem;
                    color: #FAD201;
                    margin-bottom: 1.5rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 3px solid #008753;
                }
                
                .related-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                }
                
                .related-card {
                    background: #1a1a1a;
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: 1px solid #333;
                }
                
                .related-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
                    border-color: #008753;
                }
                
                .related-card img {
                    width: 100%;
                    height: 200px;
                    object-fit: cover;
                }
                
                .related-card-content {
                    padding: 1.25rem;
                }
                
                .related-card h3 {
                    color: white;
                    font-size: 1.1rem;
                    margin-bottom: 0.5rem;
                    line-height: 1.3;
                }
                
                .related-card p {
                    color: #ccc;
                    font-size: 0.9rem;
                    margin: 0;
                }
                
                .fallback-player {
                    padding: 3rem 2rem;
                    text-align: center;
                    background: #1a1a1a;
                    border-radius: 12px;
                    border: 2px dashed #333;
                }
                
                .watch-button {
                    background: #008753;
                    color: white;
                    padding: 1rem 2rem;
                    text-decoration: none;
                    border-radius: 8px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.3s ease;
                    border: none;
                    cursor: pointer;
                }
                
                .watch-button:hover {
                    background: #006641;
                    transform: translateY(-2px);
                }
            </style>

            <header style="background:#008753; padding:1rem; position:sticky; top:0; z-index:1000; border-bottom: 3px solid #FAD201;">
                <div class="container" style="display:flex; justify-content:space-between; align-items:center;">
                    <a href="/" style="color:white; text-decoration:none; font-size:1.5rem; font-weight:bold; display:flex; align-items:center; gap:0.5rem;">
                        🎬 Rwanda Cinema
                    </a>
                    <nav style="display:flex; gap:1rem;">
                        <a href="/" style="color:white; text-decoration:none; padding:0.5rem 1rem; border-radius:6px; transition:background 0.3s;">Home</a>
                        <a href="/?category=${this.movieData.category}" style="color:white; text-decoration:none; padding:0.5rem 1rem; border-radius:6px; transition:background 0.3s; background:rgba(255,255,255,0.1);">${this.movieData.category.charAt(0).toUpperCase() + this.movieData.category.slice(1)}</a>
                    </nav>
                </div>
            </header>

            <main class="container" style="padding:2rem 0;">
                <!-- Video Player Section -->
                <section style="margin-bottom:3rem;">
                    <div class="video-wrapper">
                        ${this.renderVideoPlayer()}
                    </div>
                    
                    <div class="movie-layout">
                        <!-- Poster Section -->
                        <div class="poster-section">
                            <img src="${this.movieData.posterUrl}" alt="${this.movieData.title}" 
                                 onerror="this.src='https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=600&fit=crop'">
                        </div>
                        
                        <!-- Details Section -->
                        <div class="details-section">
                            <h1 class="movie-title">${this.movieData.title}</h1>
                            
                            <div class="movie-badges">
                                <span class="badge" style="background:#008753; color:white;">${this.movieData.releaseYear}</span>
                                <span class="badge" style="background:#FAD201; color:#000;">${this.movieData.duration}</span>
                                <span class="badge" style="background:#00A1DE; color:white;">${this.movieData.language}</span>
                                <span class="badge" style="background:#6c757d; color:white;">${this.movieData.quality}</span>
                                <span class="badge" style="background:#dc3545; color:white;">${this.movieData.rating}</span>
                            </div>
                            
                            <p class="movie-description">${this.movieData.description}</p>
                            
                            <div class="movie-meta-grid">
                                <div class="meta-item">
                                    <strong>Category</strong>
                                    <p>${this.movieData.category.charAt(0).toUpperCase() + this.movieData.category.slice(1)}</p>
                                </div>
                                <div class="meta-item">
                                    <strong>Language</strong>
                                    <p>${this.movieData.language}</p>
                                </div>
                                ${this.movieData.director ? `
                                <div class="meta-item">
                                    <strong>Director</strong>
                                    <p>${this.movieData.director}</p>
                                </div>
                                ` : ''}
                                ${this.movieData.producer ? `
                                <div class="meta-item">
                                    <strong>Producer</strong>
                                    <p>${this.movieData.producer}</p>
                                </div>
                                ` : ''}
                                ${this.movieData.mainCast ? `
                                <div class="meta-item" style="grid-column: 1 / -1;">
                                    <strong>Main Cast</strong>
                                    <p>${this.movieData.mainCast}</p>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Related Movies -->
                <section class="related-section">
                    <h2 class="section-title">
                        More ${this.movieData.category.charAt(0).toUpperCase() + this.movieData.category.slice(1)} Movies
                    </h2>
                    <div id="related-movies" class="related-grid">
                        <div style="text-align:center; color:#ccc; padding:2rem; grid-column:1/-1;">
                            <div style="display:inline-block; padding:1rem 2rem; background:#1a1a1a; border-radius:8px;">
                                Loading related movies...
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer style="background:#1a1a1a; padding:3rem 0; margin-top:4rem; border-top: 3px solid #008753;">
                <div class="container" style="text-align:center;">
                    <p style="color:#ccc; margin:0;">&copy; 2024 Rwanda Cinema. All rights reserved.</p>
                </div>
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
                        src="https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1"
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                        title="Watch ${this.movieData.title}">
                    </iframe>
                `;
            }
        }
        
        // Check if it's Odysee
        if (videoUrl.includes('odysee.com')) {
            const embedUrl = videoUrl.replace('https://odysee.com/', 'https://odysee.com/$/embed/');
            return `
                <iframe 
                    src="${embedUrl}"
                    frameborder="0" 
                    allowfullscreen
                    title="Watch ${this.movieData.title}">
                </iframe>
            `;
        }
        
        // Fallback to HTML5 video player with controls
        return `
            <video controls poster="${this.movieData.posterUrl}">
                <source src="${videoUrl}" type="video/mp4">
                <source src="${videoUrl}" type="video/webm">
                <source src="${videoUrl}" type="video/ogg">
                Your browser does not support the video tag.
                <a href="${videoUrl}" class="watch-button" style="margin-top:1rem;">
                    <i class="fas fa-play"></i> Watch Movie
                </a>
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
            // Try to load movies.json first
            const response = await fetch('/content/movies/movies.json');
            const allMovies = await response.json();
            
            this.relatedMovies = allMovies.filter(movie => 
                movie.category === this.movieData.category && 
                movie.slug !== this.movieData.slug
            ).slice(0, 6);
            
        } catch (error) {
            console.log('Using fallback for related movies');
            // Fallback: Create some dummy related movies based on current movie
            this.relatedMovies = this.createFallbackRelatedMovies();
        }
        
        this.renderRelatedMovies();
    }

    createFallbackRelatedMovies() {
        // Create some related movie suggestions based on current movie
        const relatedTitles = [
            "Another Great Rwandan Comedy",
            "Popular Kinyarwanda Film",
            "Rwandan Movie Collection",
            "Best of Rwandan Cinema",
            "African Comedy Special",
            "Kinyarwanda Drama Series"
        ];

        return relatedTitles.map((title, index) => ({
            title: title,
            category: this.movieData.category,
            slug: `related-movie-${index}`,
            posterUrl: this.movieData.posterUrl,
            releaseYear: this.movieData.releaseYear,
            duration: this.movieData.duration
        }));
    }

    renderRelatedMovies() {
        const container = document.getElementById('related-movies');
        
        if (!this.relatedMovies.length) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; color:#ccc; padding:2rem;">
                    <p>No other movies found in this category yet.</p>
                    <a href="/" class="watch-button" style="margin-top:1rem;">
                        Browse All Movies
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = this.relatedMovies.map(movie => `
            <div class="related-card" 
                 onclick="window.location.href='/movie.html?category=${movie.category}&slug=${movie.slug}'">
                <img src="${movie.posterUrl}" alt="${movie.title}" 
                     onerror="this.src='https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=300&fit=crop'">
                <div class="related-card-content">
                    <h3>${movie.title}</h3>
                    <p>${movie.releaseYear} • ${movie.duration}</p>
                </div>
            </div>
        `).join('');
    }

    setupSEO() {
        if (!this.movieData) return;

        // Update meta tags dynamically
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = this.movieData.metaDescription || this.movieData.description;

        // Create/update Open Graph tags
        const ogTags = [
            { property: 'og:title', content: this.movieData.title },
            { property: 'og:description', content: this.movieData.metaDescription || this.movieData.description },
            { property: 'og:image', content: this.movieData.posterUrl },
            { property: 'og:url', content: window.location.href },
            { property: 'og:type', content: 'video.movie' },
            { property: 'og:video', content: this.movieData.videoUrl }
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
            "inLanguage": this.movieData.language,
            "url": window.location.href
        };

        // Remove existing structured data
        const existingScript = document.querySelector('script[type="application/ld+json"]');
        if (existingScript) existingScript.remove();

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(structuredData);
        document.head.appendChild(script);
    }

    showError(message) {
        document.body.innerHTML = `
            <header style="background:#008753; padding:1rem;">
                <div class="container">
                    <a href="/" style="color:white; text-decoration:none; font-size:1.5rem; font-weight:bold;">🎬 Rwanda Cinema</a>
                </div>
            </header>
            <main class="container" style="text-align:center; padding:4rem 1rem;">
                <h1 style="color:#FAD201; margin-bottom:1rem; font-size:2rem;">Movie Not Found</h1>
                <p style="color:#ccc; margin-bottom:2rem; font-size:1.1rem;">${message}</p>
                <a href="/" class="watch-button">
                    <i class="fas fa-home"></i> Back to Home
                </a>
            </main>
        `;
    }
}

// Initialize movie player when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MoviePlayer();
});
