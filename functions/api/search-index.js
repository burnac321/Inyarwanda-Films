// functions/api/search-index.js
export async function onRequest(context) {
  const { env } = context;
  
  try {
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    const GITHUB_USERNAME = "burnac321";
    const GITHUB_REPO = "Inyarwanda-Films";
    
    // Get all movies for search index
    const allMovies = await getAllMovies(GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_REPO);
    
    return new Response(JSON.stringify(allMovies), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Search index error:', error);
    return new Response(JSON.stringify({ error: 'Failed to load search index' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

async function getAllMovies(githubToken, username, repo) {
  try {
    // Get all categories
    const categoriesUrl = `https://api.github.com/repos/${username}/${repo}/contents/content/movies`;
    
    const categoriesResponse = await fetch(categoriesUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'Inyarwanda-Films',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!categoriesResponse.ok) {
      return [];
    }
    
    const categories = await categoriesResponse.json();
    const allMovies = [];
    
    // Get movies from each category
    for (const category of categories) {
      if (category.type === 'dir') {
        const categoryName = category.name;
        
        const moviesUrl = `https://api.github.com/repos/${username}/${repo}/contents/content/movies/${categoryName}`;
        
        const moviesResponse = await fetch(moviesUrl, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'User-Agent': 'Inyarwanda-Films',
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (moviesResponse.ok) {
          const movies = await moviesResponse.json();
          
          for (const movie of movies) {
            if (movie.name.endsWith('.md') && movie.type === 'file') {
              const slug = movie.name.replace('.md', '');
              
              // Add basic movie info (without fetching content)
              allMovies.push({
                title: slug.replace(/-/g, ' '), // Use slug as placeholder title
                category: categoryName,
                slug: slug,
                url: `/${categoryName}/${slug}`
              });
            }
          }
        }
      }
    }
    
    return allMovies;
  } catch (error) {
    console.error('Error getting all movies:', error);
    return [];
  }
}
