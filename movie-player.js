// movie-player.js - Final version with video controls & clean layout
class MoviePlayer {
    constructor() {
        this.movieData = null;
        this.relatedMovies = [];
        this.currentCategory = '';
        this.currentSlug = '';
        this.videoPlaying = false;
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
                
                /* 1280x720 Aspect Ratio */
                .video-container {
                    position: relative;
                    width: 100%;
                    height: 0;
                    padding-bottom: 56.25%; /* 16:9 aspect ratio */
                    background: #000;
                }
                
                .video-thumbnail {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-size: cover;
                    background-position: center;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.3s ease;
                }
                
                .video-thumbnail.hidden {
                    opacity: 0;
                    pointer-events: none;
                }
                
                .play-button {
                    width: 80px;
                    height: 80px;
                    background: rgba(0, 135, 83, 0.9);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 2rem;
                    border: 4px solid white;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                    transition: all 0.3s ease;
                    cursor: pointer;
                }
                
                .play-button:hover {
                    background: #006641;
                    transform: scale(1.1);
                }
                
                .video-iframe {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border: none;
                }
                
                /* Hide Odysee logo and controls */
                .video-iframe.odysee {
                    position: absolute !important;
                    top: -60px !important;
                    height: calc(100% + 120px) !important;
                }
                
                /* Video Info Section */
                .video-info {
                    padding: 1.5rem;
                    background: #1a1a1a;
                    border-radius: 0 0 12px 12px;
                    border-top: 2px solid #008753;
                }
                
                .video-title {
                    font-size: 1.8rem;
                    font-weight: bold;
                    color: white;
                    margin-bottom: 1rem;
                    line-height: 1.3;
                }
                
                .video-stats {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                }
                
                .stat {
                    color: #ccc;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .video-description {
                    color: #e0e0e0;
                    line-height: 1.6;
                    font-size: 1rem;
                }
                
                .movie-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 2rem;
                    margin-bottom: 3rem;
                }
                
                .details-card {
                    background: #1a1a1a;
                    padding: 2rem;
                    border-radius: 12px;
                    border: 1px solid #333;
                }
                
                .details-card h2 {
                    color: #FAD201;
                    font-size: 1.5rem;
                    margin-bottom: 1.5rem;
                    border-bottom: 2px solid #008753;
                    padding-bottom: 0.5rem;
                }
                
                .meta-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }
                
                .meta-item {
                    margin-bottom: 1rem;
                }
                
                .meta-item strong {
                    color: #FAD201;
                    display: block;
                    margin-bottom: 0.25rem;
                    font-size: 0.9rem;
                }
                
                .meta-item p {
                    color: white;
                    margin: 0;
                    font-size: 1rem;
                }
                
                .cast-crew {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1rem;
                }
                
                .cast-item {
                    background: #252525;
                    padding: 1rem;
                    border-radius: 8px;
                    border-left: 4px solid #008753;
                }
                
                .cast-item strong {
                    color: #FAD201;
                    display: block;
                    margin-bottom: 0.5rem;
                }
                
                .cast-item p {
                    color: white;
                    margin: 0;
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
                        <div class="video-container">
                            ${this.renderVideoPlayer()}
                        </div>
                        <div class="video-info">
                            <h1 class="video-title">${this.movieData.title}</h1>
                            <div class="video-stats">
                                <span class="stat">📅 ${this.movieData.releaseYear}</span>
                                <span class="stat">⏱️ ${this.movieData.duration}</span>
                                <span class="stat">🗣️ ${this.movieData.language}</span>
                                <span class="stat">🎬 ${this.movieData.quality}</span>
                                <span class="stat">⭐ ${this.movieData.rating}</span>
                            </div>
                            <p class="video-description">${this.movieData.description}</p>
                        </div>
                    </div>
                    
                    <!-- Movie Details Grid -->
                    <div class="movie-details">
                        <!-- Movie Information -->
                        <div class="details-card">
                            <h2>Movie Information</h2>
                            <div class="meta-grid">
                                <div class="meta-item">
                                    <strong>Category</strong>
                                    <p>${this.movieData.category.charAt(0).toUpperCase() + this.movieData.category.slice(1)}</p>
                                </div>
                                <div class="meta-item">
                                    <strong>Language</strong>
                                    <p>${this.movieData.language}</p>
                                </div>
                                <div class="meta-item">
                                    <strong>Quality</strong>
                                    <p>${this.movieData.quality}</p>
                                </div>
                                <div class="meta-item">
                                    <strong>Content Rating</strong>
                                    <p>${this.movieData.rating}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Cast & Crew -->
                        <div class="details-card">
                            <h2>Cast & Crew</h2>
                            <div class="cast-crew">
                                ${this.movieData.director ? `
                                <div class="cast-item">
                                    <strong>Director</strong>
                                    <p>${this.movieData.director}</p>
                                </div>
                                ` : ''}
                                ${this.movieData.producer ? `
                                <div class="cast-item">
                                    <strong>Producer</strong>
                                    <p>${this.movieData.producer}</p>
                                </div>
                                ` : ''}
                                ${this.movieData.mainCast ? `
                                <div class="cast-item" style="grid-column: 1 / -1;">
                                    <strong>Main Cast</strong>
                                    <p>${this.movieData.mainCast}</p>
                                </div>
                                ` : ''}
                                ${this.movieData.supportingCast ? `
                                <div class="cast-item" style="grid-column: 1 / -1;">
                                    <strong>Supporting Cast</strong>
                                    <p>${this.movieData.supportingCast}</p>
                                </div>
                                ` : ''}
                                ${!this.movieData.director && !this.movieData.producer && !this.movieData.mainCast ? `
                                <div class="cast-item" style="grid-column: 1 / -1;">
                                    <p>Cast information not available</p>
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

        // Setup video play functionality
        this.setupVideoPlayer();
    }

    renderVideoPlayer() {
        const videoUrl = this.movieData.videoUrl;
        const isOdysee = videoUrl.includes('odysee.com');
        
        // Create thumbnail with play button
        return `
            <div class="video-thumbnail" id="videoThumbnail" 
                 style="background-image: url('${this.movieData.posterUrl}')">
                <div class="play-button" id="playButton">
                    ▶
                </div>
            </div>
            <iframe class="video-iframe ${isOdysee ? 'odysee' : ''}" 
                    id="videoFrame" 
                    style="display: none;"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    title="Watch ${this.movieData.title}">
            </iframe>
        `;
    }

    setupVideoPlayer() {
        const thumbnail = document.getElementById('videoThumbnail');
        const playButton = document.getElementById('playButton');
        const videoFrame = document.getElementById('videoFrame');
        const videoUrl = this.movieData.videoUrl;

        const startVideo = () => {
            let embedUrl = videoUrl;
            
            // Convert to embed URL if needed
            if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                const videoId = this.extractYouTubeId(videoUrl);
                if (videoId) {
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0`;
                }
            } else if (videoUrl.includes('odysee.com')) {
                embedUrl = videoUrl.replace('https://odysee.com/', 'https://odysee.com/$/embed/') + '?autoplay=1';
            }
            
            videoFrame.src = embedUrl;
            videoFrame.style.display = 'block';
            thumbnail.classList.add('hidden');
            this.videoPlaying = true;
        };

        // Click on thumbnail or play button starts video
        thumbnail.addEventListener('click', startVideo);
        playButton.addEventListener('click', (e) => {
            e.stopPropagation();
            startVideo();
        });
    }

    extractYouTubeId(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : false;
    }

    async loadRelatedMovies() {
        try {
            // Load all movies
            const response = await fetch('/content/movies/movies.json');
            const allMovies = await response.json();
            
            // Filter movies from same category, excluding current movie
            const sameCategoryMovies = allMovies.filter(movie => 
                movie.category === this.movieData.category && 
                movie.slug !== this.movieData.slug
            );

            // Sort by date (newest first)
            sameCategoryMovies.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Find current movie index
            const currentMovieIndex = sameCategoryMovies.findIndex(movie => 
                movie.slug === this.movieData.slug
            );

            // Get latest 2 uploads
            const latestMovies = sameCategoryMovies.slice(0, 2);
            
            // Get 2 movies uploaded before current one
            let previousMovies = [];
            if (currentMovieIndex > 0) {
                previousMovies = sameCategoryMovies.slice(
                    Math.max(0, currentMovieIndex - 2), 
                    currentMovieIndex
                );
            }

            // Combine both (remove duplicates)
            this.relatedMovies = [...latestMovies, ...previousMovies]
                .filter((movie, index, self) => 
                    index === self.findIndex(m => m.slug === movie.slug)
                )
                .slice(0, 4);
            
        } catch (error) {
            console.error('Error loading related movies:', error);
            this.relatedMovies = [];
        }
        
        this.renderRelatedMovies();
    }

    renderRelatedMovies() {
        const container = document.getElementById('related-movies');
        
        if (!this.relatedMovies.length) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; color:#ccc; padding:2rem;">
                    <p>No other movies found in this category yet.</p>
                    <a href="/" style="background: #008753; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 1rem;">
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

        // Update meta tags
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = this.movieData.metaDescription || this.movieData.description;

        // Open Graph tags
        const ogTags = [
            { property: 'og:title', content: this.movieData.title },
            { property: 'og:description', content: this.movieData.metaDescription || this.movieData.description },
            { property: 'og:image', content: this.movieData.posterUrl },
            { property: 'og:url', content: window.location.href },
            { property: 'og:type', content: 'video.movie' },
            { property: 'og:video', content: this.movieData.videoUrl },
            { property: 'og:video:duration', content: this.extractMinutes(this.movieData.duration) }
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

        // Structured data
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
            "url": window.location.href,
            "potentialAction": {
                "@type": "WatchAction",
                "target": this.movieData.videoUrl
            }
        };

        const existingScript = document.querySelector('script[type="application/ld+json"]');
        if (existingScript) existingScript.remove();

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(structuredData);
        document.head.appendChild(script);
    }

    extractMinutes(duration) {
        const match = duration.match(/(\d+)\s*min/);
        return match ? parseInt(match[1]) * 60 : 1800;
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
                <a href="/" style="background: #008753; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block;">
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
