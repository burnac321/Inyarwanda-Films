// movie-player.js - Ultimate SEO & Social Media Optimized
class MoviePlayer {
    constructor() {
        this.movieData = null;
        this.relatedMovies = [];
        this.currentCategory = '';
        this.currentSlug = '';
        this.init();
    }

    async init() {
        // Load movie data FIRST for social media crawlers
        await this.loadMovieFromURL();
        
        if (this.movieData) {
            this.generateSEOOptimizedPage();
            this.setupVideoPlayer();
            await this.loadRelatedMovies();
            this.setupSocialSharing();
        }
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
            if (!response.ok) throw new Error('Movie not found');
            
            const markdownContent = await response.text();
            this.movieData = this.parseMovieData(markdownContent);
            
        } catch (error) {
            this.showError('Failed to load movie: ' + error.message);
        }
    }

    parseMovieData(markdownContent) {
        const frontMatterMatch = markdownContent.match(/^---\n([\s\S]*?)\n---/);
        if (!frontMatterMatch) throw new Error('Invalid movie format');

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

    generateSEOOptimizedPage() {
        const pageUrl = window.location.href;
        const shareTitle = encodeURIComponent(this.movieData.title);
        const shareText = encodeURIComponent(this.movieData.description);
        const shareUrl = encodeURIComponent(pageUrl);

        document.documentElement.innerHTML = `<!DOCTYPE html>
<html lang="rw" itemscope itemtype="http://schema.org/WebPage">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>${this.escapeHTML(this.movieData.title)} - Rwanda Cinema | Watch Online</title>
    <meta name="title" content="${this.escapeHTML(this.movieData.title)} - Rwanda Cinema">
    <meta name="description" content="${this.escapeHTML(this.movieData.metaDescription || this.movieData.description)}">
    <meta name="keywords" content="${this.generateKeywords()}">
    <meta name="author" content="Rwanda Cinema">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="video.movie">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${this.escapeHTML(this.movieData.title)} - Rwanda Cinema">
    <meta property="og:description" content="${this.escapeHTML(this.movieData.metaDescription || this.movieData.description)}">
    <meta property="og:image" content="${this.movieData.posterUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Rwanda Cinema">
    <meta property="og:locale" content="rw_RW">
    <meta property="og:video" content="${this.movieData.videoUrl}">
    <meta property="og:video:type" content="text/html">
    <meta property="og:video:width" content="1280">
    <meta property="og:video:height" content="720">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${pageUrl}">
    <meta property="twitter:title" content="${this.escapeHTML(this.movieData.title)} - Rwanda Cinema">
    <meta property="twitter:description" content="${this.escapeHTML(this.movieData.metaDescription || this.movieData.description)}">
    <meta property="twitter:image" content="${this.movieData.posterUrl}">
    <meta property="twitter:site" content="@RwandaCinema">
    <meta property="twitter:creator" content="@RwandaCinema">
    
    <!-- Additional SEO Meta -->
    <meta name="theme-color" content="#008753">
    <meta name="msapplication-TileColor" content="#008753">
    <link rel="canonical" href="${pageUrl}">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- Preload Critical Resources -->
    <link rel="preload" href="${this.movieData.posterUrl}" as="image">
    <link rel="preconnect" href="https://cdnjs.cloudflare.com">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --primary: #008753;
            --secondary: #FAD201;
            --accent: #00A1DE;
            --dark: #0a0a0a;
            --card-bg: #1a1a1a;
            --text-light: #e0e0e0;
            --border: #333;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', system-ui, sans-serif;
        }

        body {
            background: var(--dark);
            color: white;
            line-height: 1.6;
            min-height: 100vh;
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
            flex-wrap: wrap;
            gap: 1rem;
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
            align-items: center;
            flex-wrap: wrap;
        }

        .nav-link {
            color: white;
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            transition: background 0.3s;
            font-weight: 500;
        }

        .nav-link:hover {
            background: rgba(255,255,255,0.1);
        }

        /* Social Sharing */
        .social-share {
            display: flex;
            gap: 0.5rem;
            margin-left: 1rem;
        }

        .share-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            padding: 0.5rem;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .share-btn:hover {
            background: var(--secondary);
            color: var(--dark);
            transform: scale(1.1);
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
            border: 1px solid var(--border);
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
            border: 1px solid var(--border);
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

        /* Breadcrumb */
        .breadcrumb {
            background: var(--card-bg);
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            font-size: 0.9rem;
        }

        .breadcrumb a {
            color: var(--secondary);
            text-decoration: none;
        }

        .breadcrumb span {
            color: var(--text-light);
            margin: 0 0.5rem;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                text-align: center;
            }

            .nav {
                justify-content: center;
            }

            .social-share {
                margin-left: 0;
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
                    <a href="/?category=${this.movieData.category}" class="nav-link">${this.capitalizeFirst(this.movieData.category)}</a>
                    <div class="social-share">
                        <button class="share-btn" onclick="shareOnFacebook()" aria-label="Share on Facebook">
                            <i class="fab fa-facebook-f"></i>
                        </button>
                        <button class="share-btn" onclick="shareOnTwitter()" aria-label="Share on Twitter">
                            <i class="fab fa-twitter"></i>
                        </button>
                        <button class="share-btn" onclick="shareOnWhatsApp()" aria-label="Share on WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </div>
                </nav>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container" role="main">
        <!-- Breadcrumb -->
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span>></span>
            <a href="/?category=${this.movieData.category}">${this.capitalizeFirst(this.movieData.category)}</a>
            <span>></span>
            <span>${this.escapeHTML(this.movieData.title)}</span>
        </nav>

        <!-- Video Section -->
        <section class="video-section" itemscope itemtype="https://schema.org/Movie">
            <div class="video-wrapper">
                <div class="video-container">
                    <div class="video-thumbnail" id="videoThumbnail" 
                         style="background-image: url('${this.movieData.posterUrl}')"
                         itemprop="thumbnailUrl" content="${this.movieData.posterUrl}">
                        <div class="play-button" id="playButton" aria-label="Play movie">
                            ▶
                        </div>
                    </div>
                    <iframe class="video-iframe ${this.movieData.videoUrl.includes('odysee.com') ? 'odysee' : ''}" 
                            id="videoFrame" 
                            style="display: none;"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowfullscreen
                            title="Watch ${this.escapeHTML(this.movieData.title)}"
                            itemprop="embedUrl" content="${this.movieData.videoUrl}">
                    </iframe>
                </div>
                
                <!-- Video Info with H1 Title -->
                <div class="video-info">
                    <h1 class="video-title" itemprop="name">${this.escapeHTML(this.movieData.title)}</h1>
                    
                    <div class="video-stats">
                        <span class="stat" itemprop="dateCreated">📅 ${this.movieData.releaseYear}</span>
                        <span class="stat" itemprop="duration">⏱️ ${this.movieData.duration}</span>
                        <span class="stat" itemprop="inLanguage">🗣️ ${this.movieData.language}</span>
                        <span class="stat">🎬 ${this.movieData.quality}</span>
                        <span class="stat" itemprop="contentRating">⭐ ${this.movieData.rating}</span>
                    </div>
                    
                    <p class="video-description" itemprop="description">${this.escapeHTML(this.movieData.description)}</p>
                </div>
            </div>
            
            <!-- Movie Details with H2 Headings -->
            <div class="movie-details">
                <div class="details-card">
                    <h2>Movie Information</h2>
                    <div class="meta-grid">
                        <div class="meta-item">
                            <strong>Category</strong>
                            <p itemprop="genre">${this.capitalizeFirst(this.movieData.category)}</p>
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
                            <p itemprop="name">${this.escapeHTML(this.movieData.director)}</p>
                        </div>
                        ` : ''}
                        ${this.movieData.producer ? `
                        <div class="cast-item" itemprop="producer" itemscope itemtype="https://schema.org/Person">
                            <strong>Producer</strong>
                            <p itemprop="name">${this.escapeHTML(this.movieData.producer)}</p>
                        </div>
                        ` : ''}
                        ${this.movieData.mainCast ? `
                        <div class="cast-item" style="grid-column: 1 / -1;">
                            <strong>Main Cast</strong>
                            <p itemprop="actor">${this.escapeHTML(this.movieData.mainCast)}</p>
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
                More ${this.capitalizeFirst(this.movieData.category)} Movies
            </h2>
            <div id="related-movies" class="related-grid">
                <div class="loading">
                    <div class="spinner" aria-hidden="true"></div>
                    <p>Loading related movies...</p>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="footer" role="contentinfo">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} Rwanda Cinema. All rights reserved.</p>
        </div>
    </footer>

    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Movie",
        "name": "${this.escapeHTML(this.movieData.title)}",
        "description": "${this.escapeHTML(this.movieData.description)}",
        "image": "${this.movieData.posterUrl}",
        "dateCreated": "${this.movieData.date}",
        "duration": "${this.movieData.duration}",
        "contentRating": "${this.movieData.rating}",
        "inLanguage": "${this.movieData.language}",
        "genre": "${this.movieData.category}",
        "url": "${window.location.href}",
        "actor": ${this.formatCast(this.movieData.mainCast)},
        "director": ${this.movieData.director ? `{"@type": "Person", "name": "${this.escapeHTML(this.movieData.director)}"}` : '[]'},
        "productionCompany": ${this.movieData.producer ? `{"@type": "Organization", "name": "${this.escapeHTML(this.movieData.producer)}"}` : '[]'},
        "potentialAction": {
            "@type": "WatchAction",
            "target": "${this.movieData.videoUrl}"
        }
    }
    </script>

    <!-- Social Sharing Script -->
    <script>
        function shareOnFacebook() {
            const url = encodeURIComponent(window.location.href);
            window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank');
        }

        function shareOnTwitter() {
            const text = encodeURIComponent('${this.escapeHTML(this.movieData.title)} - Watch on Rwanda Cinema');
            const url = encodeURIComponent(window.location.href);
            window.open('https://twitter.com/intent/tweet?text=' + text + '&url=' + url, '_blank');
        }

        function shareOnWhatsApp() {
            const text = encodeURIComponent('Check out this movie: ${this.escapeHTML(this.movieData.title)} - ' + window.location.href);
            window.open('https://wa.me/?text=' + text, '_blank');
        }
    </script>
</body>
</html>`;
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
            // Try to find related movies dynamically
            this.relatedMovies = await this.findRelatedMovies();
        } catch (error) {
            console.error('Error loading related movies:', error);
            this.relatedMovies = [];
        }
        this.renderRelatedMovies();
    }

    async findRelatedMovies() {
        // Simple approach - return empty array if no related movies found
        // You can implement directory scanning here if needed
        return [];
    }

    renderRelatedMovies() {
        const container = document.getElementById('related-movies');
        
        if (!this.relatedMovies.length) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; color:#ccc; padding:2rem;">
                    <p>No other movies found in ${this.capitalizeFirst(this.movieData.category)} category yet.</p>
                    <a href="/?category=${this.movieData.category}" style="background: var(--primary); color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 1rem;">
                        Browse ${this.capitalizeFirst(this.movieData.category)} Movies
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = this.relatedMovies.map(movie => `
            <a href="/movie?category=${movie.category}&slug=${movie.slug}" class="related-card" itemprop="relatedLink">
                <img src="${movie.posterUrl}" alt="${this.escapeHTML(movie.title)}" 
                     onerror="this.src='https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=300&fit=crop'"
                     itemprop="image">
                <div class="related-card-content">
                    <h3 itemprop="name">${this.escapeHTML(movie.title)}</h3>
                    <p>${movie.releaseYear} • ${movie.duration}</p>
                </div>
            </a>
        `).join('');
    }

    setupSocialSharing() {
        // Social sharing is already set up in the HTML
        // This function is kept for future enhancements
    }

    // Utility functions
    escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;', 
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[tag]));
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
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
            'watch online',
            'free movies'
        ];
        
        if (this.movieData.tags && this.movieData.tags.length > 0) {
            baseKeywords.push(...this.movieData.tags);
        }
        
        return baseKeywords.join(', ');
    }

    formatCast(castString) {
        if (!castString) return '[]';
        const castArray = castString.split(',').map(actor => 
            `{"@type": "Person", "name": "${this.escapeHTML(actor.trim())}"}`
        );
        return `[${castArray.join(', ')}]`;
    }

    showError(message) {
        document.documentElement.innerHTML = `<!DOCTYPE html>
<html lang="rw">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Movie Not Found - Rwanda Cinema</title>
    <style>
        body { background: #0a0a0a; color: white; font-family: system-ui, sans-serif; text-align: center; padding: 4rem 1rem; }
        h1 { color: #FAD201; margin-bottom: 1rem; }
        a { background: #008753; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 1rem; }
    </style>
</head>
<body>
    <h1>Movie Not Found</h1>
    <p>${this.escapeHTML(message)}</p>
    <a href="/">Back to Home</a>
</body>
</html>`;
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
