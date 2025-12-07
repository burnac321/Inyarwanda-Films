// _worker.js - SIMPLE WORKING VERSION
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        // ONLY USE THE WORKING ENDPOINT
        if (pathname === '/api/create-md') {
            return handleCreateMd(request, env);
        }
        
        // Homepage
        if (pathname === '/' || pathname === '/index.html') {
            return new Response(`
                <html>
                <head>
                    <title>Rwanda Cinema - Simple Upload</title>
                    <style>
                        body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; }
                        h1 { color: #008753; }
                        .container { background: #f5f5f5; padding: 30px; border-radius: 10px; }
                        input, button { padding: 10px; margin: 5px; width: 100%; }
                        button { background: #008753; color: white; border: none; cursor: pointer; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Simple Channel MD Creator</h1>
                        
                        <h3>Test Endpoint:</h3>
                        <div>
                            <input type="text" id="channelName" placeholder="Channel name (e.g., nyaxo-comedy)">
                            <input type="text" id="fileName" placeholder="File name (e.g., video-1)">
                            <button onclick="testCreateMd()">Test Create MD File</button>
                        </div>
                        
                        <div id="result" style="margin-top: 20px; padding: 10px; background: white;"></div>
                        
                        <script>
                            async function testCreateMd() {
                                const channel = document.getElementById('channelName').value;
                                const file = document.getElementById('fileName').value;
                                
                                const resultDiv = document.getElementById('result');
                                resultDiv.innerHTML = 'Testing...';
                                
                                try {
                                    const response = await fetch('/api/create-md', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            fileName: file,
                                            channelName: channel,
                                            content: '# Test File\\n\\nCreated at: ' + new Date().toLocaleString()
                                        })
                                    });
                                    
                                    const data = await response.json();
                                    resultDiv.innerHTML = JSON.stringify(data, null, 2);
                                } catch (error) {
                                    resultDiv.innerHTML = 'Error: ' + error.message;
                                }
                            }
                        </script>
                    </div>
                </body>
                </html>
            `, {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        return new Response('Not found', { status: 404 });
    }
};

// SIMPLE WORKING ENDPOINT - JUST CREATE MD FILES
async function handleCreateMd(request, env) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    try {
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
        
        // 1. Create file path
        const filePath = `channels/${channelName}/${fileName}.md`;
        
        // 2. Create content
        const mdContent = content || `# ${fileName}\n\nChannel: ${channelName}\n\nCreated: ${new Date().toISOString()}`;
        
        // 3. Encode to base64
        const contentBase64 = btoa(unescape(encodeURIComponent(mdContent)));
        
        // 4. GitHub API URL - USE THE FORMAT THAT WORKS
        const githubUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${filePath}`;
        console.log('GitHub URL:', githubUrl);
        
        // 5. Make request to GitHub
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
        
        const responseText = await githubResponse.text();
        console.log('GitHub response status:', githubResponse.status);
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            return new Response(JSON.stringify({
                success: false,
                message: 'GitHub returned invalid JSON',
                status: githubResponse.status,
                response: responseText.substring(0, 200),
                githubUrl: githubUrl
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
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
