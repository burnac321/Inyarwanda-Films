const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Utility functions
function escapeHTML(str) {
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

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Parse movie data from markdown content
function parseMovieData(markdownContent, category, slug) {
    try {
        const frontMatterMatch = markdownContent.match(/^---\n([\s\S]*?)\n---/);
        if (!frontMatterMatch) return null;

        const frontMatter = frontMatterMatch[1];
        const data = { category, slug };
        
        frontMatter.split('\n').forEach(line => {
            const match = line.match(/(\w+):\s*(.*)/);
            if (match) {
                let [, key, value] = match;
                value = value.replace(/^["'](.*)["']$/, '$1').trim();
                
                if (key === 'tags' && value.startsWith('[')) {
                    try { 
                        value = JSON.parse(value.replace(/'/g, '"')); 
                    } catch (e) { 
                        value = []; 
                    }
                }
                if (key === 'releaseYear') value = parseInt(value);
                
                data[key] = value;
            }
        });

        return data;
    } catch (error) {
        console.error('Error parsing movie data:', error);
        return null;
    }
}

// Scan directory for movie files
async function scanMoviesDirectory() {
    const movies = [];
    const categories = ['drama', 'comedy', 'action', 'documentary', 'romance']; // Add your categories
    
    for (const category of categories) {
        const categoryPath = path.join(__dirname, 'content', 'movies', category);
        
        try {
            const files = await fs.readdir(categoryPath);
            
            for (const file of files) {
                if (file.endsWith('.md')) {
                    try {
                        const filePath = path.join(categoryPath, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        const slug = file.replace('.md', '');
                        const movieData = parseMovieData(content, category, slug);
                        
                        if (movieData) {
                            movies.push({
                                ...movieData,
                                filePath,
                                lastModified: (await fs.stat(filePath)).mtime
                            });
                        }
                    } catch (error) {
                        console.error(`Error reading file ${file}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error(`Error reading category ${category}:`, error);
            // Continue with other categories
        }
    }
    
    return movies;
}

// Get latest movies (5 per category)
function getLatestMoviesByCategory(movies) {
    const categories = {};
    
    movies.forEach(movie => {
        if (!categories[movie.category]) {
            categories[movie.category] = [];
        }
        categories[movie.category].push(movie);
    });
    
    // Sort by lastModified and take latest 5 from each category
    Object.keys(categories).forEach(category => {
        categories[category] = categories[category]
            .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
            .slice(0, 5);
    });
    
    return categories;
}

// Search movies
function searchMovies(movies, query) {
    if (!query) return movies;
    
    const searchTerm = query.toLowerCase();
    return movies.filter(movie => 
        movie.title.toLowerCase().includes(searchTerm) ||
        movie.description.toLowerCase().includes(searchTerm) ||
        (movie.tags && movie.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
        movie.category.toLowerCase().includes(searchTerm)
    );
}

// Generate HTML for movie cards
function generateMovieCard(movie) {
    return `
    <div class="movie-card" data-category="${movie.category}">
        <a href="/movie?category=${movie.category}&slug=${movie.slug}" class="movie-link">
            <div class="movie-poster">
                <img src="${movie.posterUrl || '/images/default-poster.jpg'}" 
                     alt="${escapeHTML(movie.title)}"
                     onerror="this.src='/images/default-poster.jpg'">
                <div class="movie-overlay">
                    <div class="play-button">▶</div>
                </div>
                <div class="movie-badge">${movie.quality || 'HD'}</div>
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${escapeHTML(movie.title)}</h3>
                <p class="movie-description">${escapeHTML(movie.description?.substring(0, 100) || '')}...</p>
                <div class="movie-meta">
                    <span class="movie-year">${movie.releaseYear || '2024'}</span>
                    <span class="movie-duration">${movie.duration || '1:30:00'}</span>
                    <span class="movie-category">${capitalizeFirst(movie.category)}</span>
                </div>
            </div>
        </a>
    </div>
    `;
}

// Routes
app.get('/', async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const categoryFilter = req.query.category || '';
        
        // Load all movies
        const allMovies = await scanMoviesDirectory();
        
        // Apply search and filters
        let filteredMovies = allMovies;
        if (searchQuery) {
            filteredMovies = searchMovies(allMovies, searchQuery);
        }
        if (categoryFilter) {
            filteredMovies = filteredMovies.filter(movie => movie.category === categoryFilter);
        }
        
        // Get latest movies by category for featured section
        const latestByCategory = getLatestMoviesByCategory(allMovies);
        
        // Generate HTML
        const html = `<!DOCTYPE html>
<html lang="rw">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rwanda Cinema - Watch Rwandan Movies Online</title>
    <meta name="description" content="Watch latest Rwandan movies, dramas, comedies and documentaries online for free. Stream Kinyarwanda movies in HD quality.">
    <meta name="keywords" content="Rwandan movies, Rwanda cinema, Kinyarwanda films, African movies, streaming Rwanda, watch online">
    
    <!-- Open Graph -->
    <meta property="og:title" content="Rwanda Cinema - Watch Rwandan Movies Online">
    <meta property="og:description" content="Watch latest Rwandan movies, dramas, comedies and documentaries online for free.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="/">
    <meta property="og:image" content="/images/og-image.jpg">
    
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

        .search-section {
            flex: 1;
            max-width: 500px;
        }

        .search-form {
            display: flex;
            gap: 0.5rem;
        }

        .search-input {
            flex: 1;
            padding: 0.75rem 1rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            background: rgba(255,255,255,0.9);
        }

        .search-button {
            background: var(--secondary);
            color: var(--dark);
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }

        .search-button:hover {
            background: #e6c100;
            transform: translateY(-2px);
        }

        /* Navigation */
        .nav {
            display: flex;
            gap: 0.5rem;
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

        .nav-link.active {
            background: var(--secondary);
            color: var(--dark);
        }

        .nav-link:hover {
            background: rgba(255,255,255,0.1);
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
            padding: 4rem 0;
            text-align: center;
            margin-bottom: 3rem;
        }

        .hero h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: white;
        }

        .hero p {
            font-size: 1.2rem;
            color: rgba(255,255,255,0.9);
            max-width: 600px;
            margin: 0 auto;
        }

        /* Category Sections */
        .category-section {
            margin: 3rem 0;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }

        .section-title {
            font-size: 2rem;
            color: var(--secondary);
            border-bottom: 3px solid var(--primary);
            padding-bottom: 0.5rem;
        }

        .view-all {
            color: var(--accent);
            text-decoration: none;
            font-weight: bold;
            transition: color 0.3s;
        }

        .view-all:hover {
            color: var(--secondary);
        }

        /* Movie Grid */
        .movies-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        /* Movie Card */
        .movie-card {
            background: var(--card-bg);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
            border: 1px solid var(--border);
        }

        .movie-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 16px 40px rgba(0,0,0,0.4);
            border-color: var(--primary);
        }

        .movie-link {
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .movie-poster {
            position: relative;
            width: 100%;
            height: 400px;
            overflow: hidden;
        }

        .movie-poster img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .movie-card:hover .movie-poster img {
            transform: scale(1.05);
        }

        .movie-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .movie-card:hover .movie-overlay {
            opacity: 1;
        }

        .play-button {
            width: 60px;
            height: 60px;
            background: var(--primary);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            border: 3px solid white;
            transition: all 0.3s ease;
        }

        .movie-card:hover .play-button {
            background: var(--secondary);
            color: var(--dark);
            transform: scale(1.1);
        }

        .movie-badge {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: var(--secondary);
            color: var(--dark);
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.8rem;
        }

        .movie-info {
            padding: 1.5rem;
        }

        .movie-title {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: white;
            line-height: 1.3;
        }

        .movie-description {
            color: var(--text-light);
            font-size: 0.9rem;
            margin-bottom: 1rem;
            line-height: 1.4;
        }

        .movie-meta {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .movie-meta span {
            background: rgba(255,255,255,0.1);
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.8rem;
            color: var(--text-light);
        }

        /* Search Results */
        .search-results {
            margin: 2rem 0;
        }

        .results-count {
            color: var(--text-light);
            margin-bottom: 1rem;
        }

        /* No Results */
        .no-results {
            text-align: center;
            padding: 3rem;
            color: var(--text-light);
        }

        /* Footer */
        .footer {
            background: var(--card-bg);
            padding: 3rem 0;
            margin-top: 4rem;
            border-top: 3px solid var(--primary);
            text-align: center;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                text-align: center;
            }

            .search-section {
                max-width: 100%;
                width: 100%;
            }

            .hero h1 {
                font-size: 2rem;
            }

            .movies-grid {
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 1.5rem;
            }

            .section-header {
                flex-direction: column;
                gap: 1rem;
                align-items: flex-start;
            }
        }

        @media (max-width: 480px) {
            .movies-grid {
                grid-template-columns: 1fr;
            }

            .movie-meta {
                flex-direction: column;
                gap: 0.5rem;
            }

            .nav {
                justify-content: center;
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
                
                <div class="search-section">
                    <form class="search-form" action="/" method="GET" role="search">
                        <input type="text" 
                               name="search" 
                               class="search-input" 
                               placeholder="Search movies..." 
                               value="${escapeHTML(searchQuery)}"
                               aria-label="Search movies">
                        <button type="submit" class="search-button">Search</button>
                    </form>
                </div>

                <nav class="nav" role="navigation" aria-label="Main navigation">
                    <a href="/" class="nav-link ${!categoryFilter ? 'active' : ''}">All</a>
                    ${Array.from(new Set(allMovies.map(m => m.category))).map(category => `
                        <a href="/?category=${category}" class="nav-link ${categoryFilter === category ? 'active' : ''}">
                            ${capitalizeFirst(category)}
                        </a>
                    `).join('')}
                </nav>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container" role="main">
        ${searchQuery || categoryFilter ? `
            <!-- Search Results -->
            <div class="search-results">
                <h2 class="section-title">
                    ${searchQuery && categoryFilter ? `Search results for "${escapeHTML(searchQuery)}" in ${capitalizeFirst(categoryFilter)}` :
                      searchQuery ? `Search results for "${escapeHTML(searchQuery)}"` :
                      `Movies in ${capitalizeFirst(categoryFilter)}`}
                </h2>
                <p class="results-count">Found ${filteredMovies.length} movies</p>
                
                ${filteredMovies.length > 0 ? `
                    <div class="movies-grid">
                        ${filteredMovies.map(movie => generateMovieCard(movie)).join('')}
                    </div>
                ` : `
                    <div class="no-results">
                        <h3>No movies found</h3>
                        <p>Try adjusting your search terms or browse different categories.</p>
                        <a href="/" class="search-button" style="display: inline-block; margin-top: 1rem;">View All Movies</a>
                    </div>
                `}
            </div>
        ` : `
            <!-- Hero Section -->
            <section class="hero">
                <h1>Welcome to Rwanda Cinema</h1>
                <p>Discover the best Rwandan movies, dramas, and documentaries. Stream in HD quality for free.</p>
            </section>

            <!-- Latest Movies by Category -->
            ${Object.entries(latestByCategory).map(([category, movies]) => `
                <section class="category-section" aria-labelledby="${category}-section">
                    <div class="section-header">
                        <h2 class="section-title" id="${category}-section">
                            Latest ${capitalizeFirst(category)} Movies
                        </h2>
                        <a href="/?category=${category}" class="view-all">View All</a>
                    </div>
                    <div class="movies-grid">
                        ${movies.map(movie => generateMovieCard(movie)).join('')}
                    </div>
                </section>
            `).join('')}
        `}
    </main>

    <!-- Footer -->
    <footer class="footer" role="contentinfo">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} Rwanda Cinema. All rights reserved.</p>
            <p>Streaming the best of Rwandan cinema to the world.</p>
        </div>
    </footer>

    <script>
        // Add loading states and interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Add loading animation to images
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                img.addEventListener('load', function() {
                    this.style.opacity = '1';
                });
                img.style.opacity = '0';
                img.style.transition = 'opacity 0.3s ease';
            });

            // Smooth scroll for anchor links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        });
    </script>
</body>
</html>`;

        res.send(html);
    } catch (error) {
        console.error('Error loading homepage:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Error - Rwanda Cinema</title></head>
            <body style="background: #0a0a0a; color: white; text-align: center; padding: 4rem;">
                <h1>Something went wrong</h1>
                <p>We're having trouble loading the movies. Please try again later.</p>
                <a href="/" style="background: #008753; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 1rem;">Refresh Page</a>
            </body>
            </html>
        `);
    }
});

// Movie player route
app.get('/movie', (req, res) => {
    // This route will be handled by your movie-player.js
    // For now, serve a basic HTML that loads the movie player
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Loading Movie - Rwanda Cinema</title>
        <script src="/js/movie-player.js"></script>
    </head>
    <body style="background: #0a0a0a; color: white;">
        <div style="text-align: center; padding: 4rem;">
            <div class="spinner" style="border: 4px solid #333; border-top: 4px solid #008753; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            <p>Loading movie...</p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </body>
    </html>
    `);
});

// API endpoint to get movies data (for future enhancements)
app.get('/api/movies', async (req, res) => {
    try {
        const movies = await scanMoviesDirectory();
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load movies' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Rwanda Cinema server running on http://localhost:${PORT}`);
    console.log(`📁 Scanning for movies in content/movies/ directory...`);
});

module.exports = app;
