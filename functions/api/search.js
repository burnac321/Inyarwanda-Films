// functions/api/search.js
export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    // Get search query from URL
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    if (!query || query.length < 2) {
      return new Response(JSON.stringify([]), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }
    
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    const GITHUB_USERNAME = "burnac321";
    const GITHUB_REPO = "Inyarwanda-Films";
    
    // Search all movies across all categories
    const searchResults = await searchAllMovies(GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_REPO, query);
    
    return new Response(JSON.stringify(searchResults), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Search API error:', error);
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

async function searchAllMovies(githubToken, username, repo, searchQuery) {
  try {
    // First, get all categories
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
    const searchTerm = searchQuery.toLowerCase();
    const allResults = [];
    
    // Search in each category
    for (const category of categories) {
      if (category.type === 'dir') {
        const categoryName = category.name;
        
        // Get all movies in this category
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
              // Get basic file content to search
              const fileResponse = await fetch(movie.url, {
                headers: {
                  'Authorization': `token ${githubToken}`,
                  'User-Agent': 'Inyarwanda-Films',
                  'Accept': 'application/vnd.github.v3+json'
                }
              });
              
              if (fileResponse.ok) {
                const fileData = await fileResponse.json();
                const content = atob(fileData.content);
                
                // Parse frontmatter
                const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (frontMatterMatch) {
                  const frontMatter = frontMatterMatch[1];
                  let title = '';
                  let description = '';
                  let tags = [];
                  
                  frontMatter.split('\n').forEach(line => {
                    const match = line.match(/(\w+):\s*(.*)/);
                    if (match) {
                      let [, key, value] = match;
                      value = value.replace(/^["'](.*)["']$/, '$1').trim();
                      
                      if (key === 'title') title = value;
                      if (key === 'description') description = value;
                      if (key === 'tags' && value.startsWith('[')) {
                        try { tags = JSON.parse(value); } catch (e) { tags = []; }
                      }
                    }
                  });
                  
                  // Check if search term matches
                  if (title.toLowerCase().includes(searchTerm) ||
                      description.toLowerCase().includes(searchTerm) ||
                      tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                      categoryName.toLowerCase().includes(searchTerm)) {
                    
                    const slug = movie.name.replace('.md', '');
                    allResults.push({
                      title: title,
                      category: categoryName,
                      slug: slug,
                      description: description,
                      tags: tags
                    });
                    
                    // Limit results to 20 for performance
                    if (allResults.length >= 20) {
                      return allResults;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return allResults.slice(0, 10); // Return top 10 results
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
}
