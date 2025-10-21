// movie-player.js - Standalone SEO-optimized movie page generator (updated with latest related movies)
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
        this.generateBaseHTML();
        await this.loadMovieFromURL();
        this.renderMoviePlayer();
        this.loadRelatedMovies(); // now shows latest + previous
        this.setupSEO();
    }

    generateBaseHTML() {
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
    <meta property="og:site_name" content="Rwanda Cinema">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="rw_RW">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@RwandaCinema">
    <link rel="canonical" href="${window.location.href}">
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
        * {margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;}
        body {background:var(--dark);color:white;line-height:1.6;}
        .container {max-width:1200px;margin:0 auto;padding:0 1rem;}
        .header {background:var(--primary);padding:1rem 0;position:sticky;top:0;z-index:1000;border-bottom:3px solid var(--secondary);}
        .header-content {display:flex;justify-content:space-between;align-items:center;}
        .logo {color:white;text-decoration:none;font-size:1.5rem;font-weight:bold;display:flex;align-items:center;gap:0.5rem;}
        .nav {display:flex;gap:1rem;}
        .nav-link {color:white;text-decoration:none;padding:0.5rem 1rem;border-radius:6px;transition:background 0.3s;}
        .nav-link:hover {background:rgba(255,255,255,0.1);}
        .video-section {margin:2rem 0 3rem;}
        .video-wrapper {background:#000;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.3);margin-bottom:2rem;}
        .video-container {position:relative;width:100%;height:0;padding-bottom:56.25%;background:#000;}
        .video-thumbnail {position:absolute;top:0;left:0;width:100%;height:100%;background-size:cover;background-position:center;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity 0.3s ease;}
        .video-thumbnail.hidden {opacity:0;pointer-events:none;}
        .play-button {width:80px;height:80px;background:rgba(0,135,83,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:2rem;border:4px solid white;box-shadow:0 8px 32px rgba(0,0,0,0.5);transition:all 0.3s ease;cursor:pointer;}
        .play-button:hover {background:#006641;transform:scale(1.1);}
        .video-iframe {position:absolute;top:0;left:0;width:100%;height:100%;border:none;}
        .video-iframe.odysee {position:absolute!important;top:-60px!important;height:calc(100% + 120px)!important;}
        .video-info {padding:2rem;background:var(--card-bg);border-radius:0 0 12px 12px;}
        .video-title {font-size:2.2rem;font-weight:bold;color:white;margin-bottom:1rem;line-height:1.3;}
        .video-stats {display:flex;gap:1.5rem;margin-bottom:1.5rem;flex-wrap:wrap;}
        .stat {color:var(--text-light);font-size:1rem;display:flex;align-items:center;gap:0.5rem;}
        .video-description {color:var(--text-light);line-height:1.7;font-size:1.1rem;}
        .movie-details {display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2rem;margin-bottom:3rem;}
        .details-card {background:var(--card-bg);padding:2rem;border-radius:12px;border:1px solid #333;}
        .details-card h2 {color:var(--secondary);font-size:1.5rem;margin-bottom:1.5rem;border-bottom:2px solid var(--primary);padding-bottom:0.5rem;}
        .meta-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;}
        .meta-item strong {color:var(--secondary);display:block;margin-bottom:0.25rem;font-size:0.9rem;}
        .meta-item p {color:white;margin:0;font-size:1rem;}
        .related-section {margin-top:3rem;}
        .section-title {font-size:1.8rem;color:var(--secondary);margin-bottom:1.5rem;padding-bottom:0.5rem;border-bottom:3px solid var(--primary);}
        .related-grid {display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem;}
        .related-card {background:var(--card-bg);border-radius:12px;overflow:hidden;cursor:pointer;transition:all 0.3s ease;border:1px solid #333;text-decoration:none;color:inherit;display:block;}
        .related-card:hover {transform:translateY(-5px);box-shadow:0 12px 40px rgba(0,0,0,0.4);border-color:var(--primary);}
        .related-card img {width:100%;height:200px;object-fit:cover;}
        .related-card-content {padding:1.25rem;}
        .related-card h3 {color:white;font-size:1.1rem;margin-bottom:0.5rem;line-height:1.3;}
        .related-card p {color:#ccc;font-size:0.9rem;margin:0;}
        .footer {background:var(--card-bg);padding:3rem 0;margin-top:4rem;border-top:3px solid var(--primary);text-align:center;}
        .loading {text-align:center;padding:4rem 2rem;color:var(--text-light);}
        .spinner {border:4px solid #333;border-top:4px solid var(--primary);border-radius:50%;width:50px;height:50px;animation:spin 1s linear infinite;margin:0 auto 1rem;}
        @keyframes spin {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
    </style>
</head>
<body>
<header class="header"><div class="container"><div class="header-content"><a href="/" class="logo">🎬 Rwanda Cinema</a><nav class="nav"><a href="/" class="nav-link">Home</a><a href="#" class="nav-link" id="categoryLink">Category</a></nav></div></div></header>
<main class="container"><div class="loading"><div class="spinner"></div><p>Loading movie...</p></div></main>
<footer class="footer"><div class="container"><p>&copy; 2024 Rwanda Cinema. All rights reserved.</p></div></footer>
</body></html>`;
    }

    async loadMovieFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentCategory = urlParams.get('category');
        this.currentSlug = urlParams.get('slug');
        if (!this.currentCategory || !this.currentSlug) return this.showError('Movie not found');
        try {
            const res = await fetch(`/content/movies/${this.currentCategory}/${this.currentSlug}.md`);
            if (!res.ok) throw new Error('Movie not found');
            const markdown = await res.text();
            this.movieData = this.parseMovieData(markdown);
        } catch {
            this.showError('Failed to load movie');
        }
    }

    parseMovieData(md) {
        const front = md.match(/^---\n([\s\S]*?)\n---/);
        if (!front) throw new Error('Invalid movie format');
        const data = {};
        front[1].split('\n').forEach(l => {
            const m = l.match(/(\w+):\s*(.*)/);
            if (m) {
                let [, k, v] = m;
                v = v.replace(/^["']|["']$/g, '').trim();
                if (k === 'tags' && v.startsWith('[')) try { v = JSON.parse(v); } catch { v = []; }
                if (k === 'releaseYear') v = parseInt(v);
                data[k] = v;
            }
        });
        return data;
    }

    renderMoviePlayer() {
        if (!this.movieData) return this.showError('Movie data not available');
        const catLink = document.getElementById('categoryLink');
        if (catLink) {
            catLink.href = `/?category=${this.movieData.category}`;
            catLink.textContent = this.movieData.category.charAt(0).toUpperCase() + this.movieData.category.slice(1);
        }
        const main = document.querySelector('main');
        main.innerHTML = `
        <section class="video-section" itemscope itemtype="https://schema.org/Movie">
            <div class="video-wrapper">
                <div class="video-container">${this.renderVideoPlayer()}</div>
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
            <div class="movie-details">
                <div class="details-card">
                    <h2>Movie Information</h2>
                    <div class="meta-grid">
                        <div class="meta-item"><strong>Category</strong><p>${this.movieData.category}</p></div>
                        <div class="meta-item"><strong>Language</strong><p>${this.movieData.language}</p></div>
                        <div class="meta-item"><strong>Quality</strong><p>${this.movieData.quality}</p></div>
                        <div class="meta-item"><strong>Rating</strong><p>${this.movieData.rating}</p></div>
                    </div>
                </div>
                <div class="details-card">
                    <h2>Cast & Crew</h2>
                    <div class="cast-crew">
                        ${this.movieData.director ? `<div class="cast-item"><strong>Director</strong><p>${this.movieData.director}</p></div>` : ''}
                        ${this.movieData.producer ? `<div class="cast-item"><strong>Producer</strong><p>${this.movieData.producer}</p></div>` : ''}
                        ${this.movieData.mainCast ? `<div class="cast-item" style="grid-column:1/-1;"><strong>Main Cast</strong><p>${this.movieData.mainCast}</p></div>` : ''}
                    </div>
                </div>
            </div>
        </section>
        <section class="related-section">
            <h2 class="section-title">Latest ${this.movieData.category.charAt(0).toUpperCase() + this.movieData.category.slice(1)} Movies</h2>
            <div id="related-movies" class="related-grid">
                <div class="loading"><div class="spinner"></div><p>Loading related movies...</p></div>
            </div>
        </section>`;
        this.setupVideoPlayer();
    }

    renderVideoPlayer() {
        const url = this.movieData.videoUrl;
        const odysee = url.includes('odysee.com');
        return `
        <div class="video-thumbnail" id="videoThumbnail" style="background-image:url('${this.movieData.posterUrl}')">
            <div class="play-button" id="playButton">▶</div>
        </div>
        <iframe class="video-iframe ${odysee ? 'odysee' : ''}" id="videoFrame" style="display:none;" allowfullscreen></iframe>`;
    }

    setupVideoPlayer() {
        const thumb = document.getElementById('videoThumbnail');
        const playBtn = document.getElementById('playButton');
        const frame = document.getElementById('videoFrame');
        const url = this.movieData.videoUrl;
        const start = () => {
            let embed = url;
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const id = this.extractYouTubeId(url);
                if (id) embed = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
            } else if (url.includes('odysee.com')) {
                embed = url.replace('https://odysee.com/', 'https://odysee.com/$/embed/') + '?autoplay=1';
            }
            frame.src = embed;
            frame.style.display = 'block';
            thumb.classList.add('hidden');
        };
        thumb.addEventListener('click', start);
        playBtn.addEventListener('click', e => { e.stopPropagation(); start(); });
    }

    extractYouTubeId(url) {
        const reg = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const m = url.match(reg);
        return (m && m[7].length === 11) ? m[7] : false;
    }

    async loadRelatedMovies() {
        try {
            const res = await fetch('/content/movies/movies.json');
            const all = await res.json();
            const catMovies = all.filter(m => m.category === this.movieData.category && m.slug !== this.movieData.slug);
            catMovies.sort((a, b) => new Date(b.date) - new Date(a.date));
            const currentIndex = catMovies.findIndex(m => m.slug === this.movieData.slug);
            const latest = catMovies.slice(0, 2);
            const previous = currentIndex > 0 ? catMovies.slice(Math.max(0, currentIndex - 2), currentIndex) : [];
            this.relatedMovies = [...latest, ...previous]
                .filter((m, i, self) => i === self.findIndex(x => x.slug === m.slug))
                .slice(0, 4);
        } catch {
            this.relatedMovies = [];
        }
        this.renderRelatedMovies();
    }

    renderRelatedMovies() {
        const c = document.getElementById('related-movies');
        if (!this.relatedMovies.length) {
            c.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#ccc;padding:2rem;">
                <p>No other movies found in this category yet.</p>
                <a href="/" style="background:var(--primary);color:white;padding:1rem 2rem;border-radius:8px;text-decoration:none;display:inline-block;margin-top:1rem;">Browse All Movies</a>
            </div>`;
            return;
        }
        c.innerHTML = this.relatedMovies.map(m => `
        <a href="/movie?category=${m.category}&slug=${m.slug}" class="related-card">
            <img src="${m.posterUrl}" alt="${m.title}" onerror="this.src='https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=300&fit=crop'">
            <div class="related-card-content">
                <h3>${m.title}</h3>
                <p>${m.releaseYear} • ${m.duration}</p>
            </div>
        </a>`).join('');
    }

    setupSEO() {
        if (!this.movieData) return;
        document.title = `${this.movieData.title} - Rwanda Cinema | Rwandan ${this.movieData.category} Movie`;
        let desc = document.querySelector('meta[name="description"]');
        if (desc) desc.content = this.movieData.metaDescription || this.movieData.description;
    }

    showError(msg) {
        const main = document.querySelector('main');
        main.innerHTML = `<div style="text-align:center;padding:4rem 2rem;">
            <h1 style="color:var(--secondary);margin-bottom:1rem;">Movie Not Found</h1>
            <p style="color:var(--text-light);margin-bottom:2rem;">${msg}</p>
            <a href="/" style="background:var(--primary);color:white;padding:1rem 2rem;text-decoration:none;border-radius:8px;display:inline-block;">Back to Home</a>
        </div>`;
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new MoviePlayer());
} else {
    new MoviePlayer();
}
