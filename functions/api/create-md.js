export async function onRequestPost(context) {
    const { request, env } = context;
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    try {
        // Get data from request
        const data = await request.json();
        const { fileName, channelName, content } = data;
        
        if (!fileName || !channelName) {
            return new Response(JSON.stringify({
                success: false,
                message: 'fileName and channelName are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Generate file path
        const filePath = `channels/${channelName}/${fileName}.md`;
        
        // Create simple MD content if not provided
        const mdContent = content || `# ${fileName}\n\nChannel: ${channelName}\n\nCreated: ${new Date().toISOString()}`;
        
        // Encode content to base64
        const contentBase64 = btoa(unescape(encodeURIComponent(mdContent)));
        
        // GitHub API URL
        const githubUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${filePath}`;
        
        // Make request to GitHub
        const githubResponse = await fetch(githubUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Rwanda-Cinema'
            },
            body: JSON.stringify({
                message: `Create MD file: ${fileName} for channel ${channelName}`,
                content: contentBase64,
                branch: 'main'
            })
        });
        
        const result = await githubResponse.json();
        
        if (githubResponse.ok) {
            return new Response(JSON.stringify({
                success: true,
                message: 'MD file created successfully',
                filePath: filePath,
                githubUrl: result.content.html_url,
                sha: result.content.sha
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                message: result.message || 'GitHub API error',
                details: result
            }), {
                status: githubResponse.status,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}
