export async function onRequestGet(context) {
    try {
        const { env } = context;
        
        // Get categories from GitHub
        const categories = await getCategoriesFromGitHub(env);
        
        return new Response(JSON.stringify({
            success: true,
            categories: categories
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
        
    } catch (error) {
        console.error('Error in get-categories:', error);
        
        // Return empty array as fallback
        return new Response(JSON.stringify({
            success: true,
            categories: []
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

async function getCategoriesFromGitHub(env) {
    try {
        // GitHub repository details
        const owner = env.GITHUB_OWNER;
        const repo = env.GITHUB_REPO;
        const path = 'data/categories.json';
        const token = env.GITHUB_TOKEN;
        
        if (!owner || !repo || !token) {
            console.warn('GitHub configuration missing');
            return [];
        }
        
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'User-Agent': 'Rwanda-Cinema-App',
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        if (response.status === 404) {
            // Categories file doesn't exist yet - this is normal for first use
            console.log('Categories file does not exist yet. This is normal for first-time setup.');
            return [];
        }
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // GitHub returns file content as base64 encoded string
        if (data.content) {
            const content = atob(data.content.replace(/\n/g, ''));
            const categoriesData = JSON.parse(content);
            return categoriesData.categories || [];
        }
        
        return [];
        
    } catch (error) {
        console.error('Error fetching categories from GitHub:', error);
        return [];
    }
    }
