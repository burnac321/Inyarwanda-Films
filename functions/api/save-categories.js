export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        
        // Parse the request body
        const body = await request.json();
        const { categories } = body;
        
        if (!categories || !Array.isArray(categories)) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Invalid categories data'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }
        
        // Validate categories
        const validCategories = categories.filter(cat => 
            typeof cat === 'string' && cat.trim().length > 0
        ).map(cat => cat.trim().toLowerCase());
        
        // Remove duplicates
        const uniqueCategories = [...new Set(validCategories)];
        
        if (uniqueCategories.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                message: 'No valid categories provided'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        // Save to GitHub
        const saveResult = await saveCategoriesToGitHub(uniqueCategories, env);
        
        if (!saveResult.success) {
            return new Response(JSON.stringify({
                success: false,
                message: saveResult.message || 'Failed to save categories'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Categories saved successfully',
            categories: uniqueCategories
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
        console.error('Error in save-categories:', error);
        
        return new Response(JSON.stringify({
            success: false,
            message: 'Internal server error: ' + error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

async function saveCategoriesToGitHub(categories, env) {
    try {
        const owner = env.GITHUB_OWNER;
        const repo = env.GITHUB_REPO;
        const path = 'data/categories.json';
        const token = env.GITHUB_TOKEN;
        
        if (!owner || !repo || !token) {
            return {
                success: false,
                message: 'GitHub configuration missing. Please set GITHUB_OWNER, GITHUB_REPO, and GITHUB_TOKEN environment variables.'
            };
        }
        
        // First, try to get the existing file to get its SHA (for updating)
        let sha = null;
        let existingCategories = [];
        
        try {
            const getResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'User-Agent': 'Rwanda-Cinema-App',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (getResponse.ok) {
                const existingData = await getResponse.json();
                sha = existingData.sha;
                
                // Get existing categories to preserve any metadata
                if (existingData.content) {
                    const content = atob(existingData.content.replace(/\n/g, ''));
                    const existingFileData = JSON.parse(content);
                    existingCategories = existingFileData.categories || [];
                }
            }
        } catch (error) {
            // File doesn't exist yet, that's fine - we'll create it
            console.log('Categories file does not exist, will create new one');
        }
        
        // Prepare the content
        const content = {
            categories: categories,
            lastUpdated: new Date().toISOString(),
            totalCategories: categories.length,
            updatedBy: 'Rwanda Cinema Admin'
        };
        
        const contentBase64 = btoa(JSON.stringify(content, null, 2));
        
        // Create or update the file
        const updateResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'User-Agent': 'Rwanda-Cinema-App',
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Update movie categories - ${new Date().toISOString()}`,
                    content: contentBase64,
                    sha: sha // Will be null for new files, which is fine
                })
            }
        );
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('GitHub API error details:', errorData);
            throw new Error(`GitHub API error: ${updateResponse.status} - ${errorData.message || 'Unknown error'}`);
        }
        
        return {
            success: true,
            message: 'Categories saved to GitHub successfully'
        };
        
    } catch (error) {
        console.error('Error saving categories to GitHub:', error);
        return {
            success: false,
            message: 'Failed to save categories to GitHub: ' + error.message
        };
    }
                    }
