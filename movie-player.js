// movie-player.js - Standalone SEO-optimized movie page generator
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
        // Generate complete HTML structure
        this.generateBaseHTML();
        await this.loadMovieFromURL();
        this.renderMoviePlayer();
        this.loadRelatedMovies();
        this.setupSEO();
    }

    generateBaseHTML() {
        // Create complete HTML document structure
        document.documentElement.innerHTML = `
<!DOCTYPE html>
<html lang="rw" itemscope itemtype="https://schema.org/WebPage">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loading Movie - Rwanda Cinema | Rwandan Movies Streaming</title>
    <meta name="description" content="Watch Rwandan movies online. Stream latest Kinyarwanda films, comedies, dramas and documentaries.">
    <meta name="keywords" content="Rwandan movies, Rwanda cinema, Kinyarwanda films, African movies, streaming">
    <meta name="robots" content="index, follow">
    
    <!-- OpenGraph Meta Tags -->
    <meta property="og:site_name" content="Rwanda Cinema">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="rw_RW">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@RwandaCinema">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${window.location.href}">
    
    <!-- Preload critical resources -->
    <link rel="preconnect" href="https://cdnjs.cloudflare.com">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --primary: #008753;
            --secondary: #FAD201;
            --accent: #00A1DE;
            --dark: #0a0a0a;
            --light: #f8f9fa;
            --card-bg: #1a1a1a;
            --text-light: #e0e0e0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
            background: var(--dark);
            color: white;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }

        /* Header */
        .header {
            background: var(--primary);
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 1000;
            border-bottom: 3px solid var(--secondary);
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            color: white;
            text-decoration: none;
            font-size: 1.5rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .nav {
            display: flex;
            gap: 1rem;
        }

        .nav-link {
            color: white;
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            transition: background 0.3s;
        }

        .nav-link:hover {
            background: rgba(255,255,255,0.1);
        }

        /* Video Player */
        .video-section {
            margin: 2rem 0 3rem;
        }

        .video-wrapper {
            background: #000;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            margin-bottom: 2rem;
        }

        .video-container {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%;
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

        .video-iframe.odysee {
            position: absolute !important;
            top: -60px !important;
            height: calc(100% + 120px) !important;
        }

        /* Video Info */
        .video-info {
            padding: 2rem;
            background: var(--card-bg);
            border-radius: 0 0 12px 12px;
        }

        .video-title {
            font-size: 2.2rem;
            font-weight: bold;
            color: white;
            margin-bottom: 1rem;
            line-height: 1.3;
        }

        .video-stats {
            display: flex;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
        }

        .stat {
            color: var(--text-light);
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .video-description {
            color: var(--text-light);
            line-height: 1.7;
            font-size: 1.1rem;
        }

        /* Movie Details */
        .movie-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }

        .details-card {
            background: var(--card-bg);
            padding: 2rem;
            border-radius: 12px;
            border: 1px solid #333;
        }

        .details-card h2 {
            color: var(--secondary);
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            border-bottom: 2px solid var(--primary);
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
            color: var(--secondary);
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
            border-left: 4px solid var(--primary);
        }

        .cast-item strong {
            color: var(--secondary);
            display: block;
            margin-bottom: 0.5rem;
        }

        .cast-item p {
            color: white;
            margin: 0;
        }

        /* Related Movies */
        .related-section {
            margin-top: 3rem;
        }

        .section-title {
            font-size: 1.8rem;
            color: var(--secondary);
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 3px solid var(--primary);
        }

        .related-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
        }

        .related-card {
            background: var(--card-bg);
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid #333;
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .related-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.4);
            border-color: var(--primary);
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

        /* Footer */
        .footer {
            background: var(--card-bg);
            padding: 3rem 0;
            margin-top: 4rem;
            border-top: 3px solid var(--primary);
            text-align: center;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 1rem;
            }

            .nav {
                flex-wrap: wrap;
                justify-content: center;
            }

            .video-title {
                font-size: 1.8rem;
            }

            .video-stats {
                gap: 1rem;
            }

            .movie-details {
                grid-template-columns: 1fr;
            }

            .related-grid {
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            }
        }

        @media (max-width: 480px) {
            .video-title {
                font-size: 1.5rem;
            }

            .video-stats {
                flex-direction: column;
                gap: 0.5rem;
            }

            .related-grid {
                grid-template-columns: 1fr;
            }
        }

        /* Loading State */
        .loading {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-light);
        }

        .spinner {
            border: 4px solid #333;
            border-top: 4px solid var(--primary);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header" role="banner">
        <div class="container">
            <div class="header-content">
                <a href="/" class="logo" aria-label="Rwanda Cinema Home">
                    🎬 Rwanda Cinema
                </a>
                <nav class="nav" role="navigation" aria-label="Main navigation">
                    <a href="/" class="nav-link">Home</a>
                    <a href="#" class="nav-link" id="categoryLink">Category</a>
                </nav>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container" role="main">
        <div class="loading">
            <div class="spinner" aria-hidden="true"></div>
            <p>Loading movie...</p>
        </div>
    </main>

    <!-- Footer -->
    <footer class="footer" role="contentinfo">
        <div class="container">
            <p>&copy; 2024 Rwanda Cinema. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;
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

        // Update category link
        const categoryLink = document.getElementById('categoryLink');
        if (categoryLink) {
            categoryLink.href = `/?category=${this.movieData.category}`;
            categoryLink.textContent = this.movieData.category.charAt(0).toUpperCase() + this.movieData.category.slice(1);
        }

        const main = document.querySelector('main');
        main.innerHTML = `
            <!-- Video Section -->
            <section class="video-section" itemscope itemtype="https://schema.org/Movie">
                <div class="video-wrapper">
                    <div class="video-container">
                        ${this.renderVideoPlayer()}
                    </div>
                    
                    <!-- Video Info with H1 Title -->
                    <div class="video-info">
                        <h1 class="video-title" itemprop="name">${this.movieData.title}</h1>
                        
                        <div class="video-stats">
                            <span class="stat" itemprop="dateCreated">📅 ${this.movieData.releaseYear}</span>
                            <span class="stat" itemprop="duration">⏱️ ${this.movieData.duration}</span>
                            <span class="stat" itemprop="inLanguage">🗣️ ${this.movieData.language}</span>
                            <span class="stat">🎬 ${this.movieData.quality}</span>
                            <span class="stat" itemprop="contentRating">⭐ ${this.movieData.rating}</span>
                        </div>
                        
                        <p class="video-description" itemprop="description">${this.movieData.description}</p>
                    </div>
                </div>
                
                <!-- Movie Details with H2 Headings -->
                <div class="movie-details">
                    <div class="details-card">
                        <h2>Movie Information</h2>
                        <div class="meta-grid">
                            <div class="meta-item">
                                <strong>Category</strong>
                                <p itemprop="genre">${this.movieData.category.charAt(0).toUpperCase() + this.movieData.category.slice(1)}</p>
                            </div>
                            <div class="meta-item">
                                <strong>Language</strong>
                                <p itemprop="inLanguage">${this.movieData.language}</p>
                            </div>
                            <div class="meta-item">
                                <strong>Quality</strong>
                                <p>${this.movieData.quality}</p>
                            </div>
                            <div class="meta-item">
                                <strong>Content Rating</strong>
                                <p itemprop="contentRating">${this.movieData.rating}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="details-card">
                        <h2>Cast & Crew</h2>
                        <div class="cast-crew">
                            ${this.movieData.director ? `
                            <div class="cast-item" itemprop="director" itemscope itemtype="https://schema.org/Person">
                                <strong>Director</strong>
                                <p itemprop="name">${this.movieData.director}</p>
                            </div>
                            ` : ''}
                            ${this.movieData.producer ? `
                            <div class="cast-item" itemprop="producer" itemscope itemtype="https://schema.org/Person">
                                <strong>Producer</strong>
                                <p itemprop="name">${this.movieData.producer}</p>
                            </div>
                            ` : ''}
                            ${this.movieData.mainCast ? `
                            <div class="cast-item" style="grid-column: 1 / -1;">
                                <strong>Main Cast</strong>
                                <p itemprop="actor">${this.movieData.mainCast}</p>
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

            <!-- Related Movies with H2 Heading -->
            <section class="related-section">
                <h2 class="section-title">
                    More ${this.movieData.category.charAt(0).toUpperCase() + this.movieData.category.slice(1)} Movies
                </h2>
                <div id="related-movies" class="related-grid">
                    <div class="loading">
                        <div class="spinner" aria-hidden="true"></div>
                        <p>Loading related movies...</p>
                    </div>
                </div>
            </section>
        `;

        // Setup video play functionality
        this.setupVideoPlayer();
    }

    renderVideoPlayer() {
        const videoUrl = this.movieData.videoUrl;
        const isOdysee = videoUrl.includes('odysee.com');
        
        return `
            <div class="video-thumbnail" id="videoThumbnail" 
                 style="background-image: url('${this.movieData.posterUrl}')"
                 itemprop="thumbnailUrl" content="${this.movieData.posterUrl}">
                <div class="play-button" id="playButton" aria-label="Play movie">
                    ▶
                </div>
            </div>
            <iframe class="video-iframe ${isOdysee ? 'odysee' : ''}" 
                    id="videoFrame" 
                    style="display: none;"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowfullscreen
                    title="Watch ${this.movieData.title}"
                    itemprop="embedUrl" content="${videoUrl}">
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
            
            if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                const videoId = this.extractYouTubeId(videoUrl);
                if (videoId) {
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0&fs=1`;
                }
            } else if (videoUrl.includes('odysee.com')) {
                embedUrl = videoUrl.replace('https://odysee.com/', 'https://odysee.com/$/embed/') + '?autoplay=1';
            }
            
            videoFrame.src = embedUrl;
            videoFrame.style.display = 'block';
            thumbnail.classList.add('hidden');
            this.videoPlaying = true;
        };

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
            const response = await fetch('/content/movies/movies.json');
            const allMovies = await response.json();
            
            const sameCategoryMovies = allMovies.filter(movie => 
                movie.category === this.movieData.category && 
                movie.slug !== this.movieData.slug
            );

            sameCategoryMovies.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const currentMovieIndex = sameCategoryMovies.findIndex(movie => 
                movie.slug === this.movieData.slug
            );

            const latestMovies = sameCategoryMovies.slice(0, 2);
            
            let previousMovies = [];
            if (currentMovieIndex > 0) {
                previousMovies = sameCategoryMovies.slice(
                    Math.max(0, currentMovieIndex - 2), 
                    currentMovieIndex
                );
            }

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
                    <a href="/" style="background: var(--primary); color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 1rem;">
                        Browse All Movies
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = this.relatedMovies.map(movie => `
            <a href="/movie?category=${movie.category}&slug=${movie.slug}" class="related-card" itemprop="relatedLink">
                <img src="${movie.posterUrl}" alt="${movie.title}" 
                     onerror="this.src='https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=300&fit=crop'"
                     itemprop="image">
                <div class="related-card-content">
                    <h3 itemprop="name">${movie.title}</h3>
                    <p>${movie.releaseYear} • ${movie.duration}</p>
                </div>
            </a>
        `).join('');
    }

    setupSEO() {
        if (!this.movieData) return;

        // Update document title and meta description
        document.title = `${this.movieData.title} - Rwanda Cinema | Rwandan ${this.movieData.category} Movie`;
        
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = this.movieData.metaDescription || this.movieData.description;
        }

        // Update OpenGraph tags
        const ogTags = {
            'og:title': this.movieData.title,
            'og:description': this.movieData.metaDescription || this.movieData.description,
            'og:image': this.movieData.posterUrl,
            'og:url': window.location.href,
            'og:type': 'video.movie',
            'og:video': this.movieData.videoUrl,
            'og:video:duration': this.extractMinutes(this.movieData.duration)
        };

        Object.entries(ogTags).forEach(([property, content]) => {
            let meta = document.querySelector(`meta[property="${property}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('property', property);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        });

        // Add JSON-LD structured data
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

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(structuredData);
        document.head.appendChild(script);

        // Update canonical URL
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            canonical.href = window.location.href;
        }
    }

    extractMinutes(duration) {
        const match = duration.match(/(\d+)\s*min/);
        return match ? parseInt(match[1]) * 60 : 1800;
    }

    showError(message) {
        const main = document.querySelector('main');
        main.innerHTML = `
            <div style="text-align:center; padding:4rem 2rem;">
                <h1 style="color:var(--secondary); margin-bottom:1rem;">Movie Not Found</h1>
                <p style="color:var(--text-light); margin-bottom:2rem;">${message}</p>
                <a href="/" style="background: var(--primary); color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block;">
                    Back to Home
                </a>
            </div>
        `;
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new MoviePlayer();
    });
} else {
    new MoviePlayer();
    }
