// _worker.js - Enhanced with YouTube RSS and web scraping
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        // Use the working endpoint but make it create JSON
        if (pathname === '/api/create-md') {
            return handleCreateChannelJson(request, env);
        }
        
        // New endpoint to fetch video metadata from URL
        if (pathname === '/api/fetch-metadata') {
            return handleFetchMetadata(request, env);
        }
        
        // New endpoint to get YouTube channel info
        if (pathname === '/api/fetch-youtube-channel') {
            return handleFetchYouTubeChannel(request, env);
        }
        
        // New endpoint to process video from YouTube URL
        if (pathname === '/api/process-youtube') {
            return handleProcessYouTube(request, env);
        }
        
        // New dashboard with enhanced features
        if (pathname === '/' || pathname === '/dashboard.html') {
            return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Video Metadata Fetcher</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        * {
                            box-sizing: border-box;
                            margin: 0;
                            padding: 0;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        }
                        
                        body {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            padding: 20px;
                        }
                        
                        .container {
                            max-width: 1200px;
                            margin: 0 auto;
                            background: white;
                            border-radius: 20px;
                            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                            overflow: hidden;
                        }
                        
                        .header {
                            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                            color: white;
                            padding: 40px;
                            text-align: center;
                        }
                        
                        .header h1 {
                            font-size: 2.8rem;
                            margin-bottom: 10px;
                            background: linear-gradient(45deg, #ffffff, #e0e7ff);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                        }
                        
                        .header p {
                            font-size: 1.2rem;
                            opacity: 0.9;
                            max-width: 600px;
                            margin: 0 auto;
                        }
                        
                        .main-content {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 30px;
                            padding: 40px;
                        }
                        
                        @media (max-width: 768px) {
                            .main-content {
                                grid-template-columns: 1fr;
                            }
                        }
                        
                        .card {
                            background: #f8fafc;
                            border-radius: 15px;
                            padding: 30px;
                            border: 1px solid #e2e8f0;
                            transition: all 0.3s ease;
                        }
                        
                        .card:hover {
                            transform: translateY(-5px);
                            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                        }
                        
                        .card h2 {
                            color: #4f46e5;
                            margin-bottom: 20px;
                            font-size: 1.8rem;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        }
                        
                        .card h2 i {
                            font-size: 1.5rem;
                        }
                        
                        .form-group {
                            margin-bottom: 20px;
                        }
                        
                        .form-group label {
                            display: block;
                            margin-bottom: 8px;
                            color: #475569;
                            font-weight: 600;
                        }
                        
                        .form-control {
                            width: 100%;
                            padding: 12px 15px;
                            border: 2px solid #e2e8f0;
                            border-radius: 10px;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                        }
                        
                        .form-control:focus {
                            outline: none;
                            border-color: #4f46e5;
                            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
                        }
                        
                        .btn {
                            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                            color: white;
                            border: none;
                            padding: 14px 28px;
                            border-radius: 10px;
                            font-size: 1.1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            width: 100%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 10px;
                        }
                        
                        .btn:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3);
                        }
                        
                        .btn:active {
                            transform: translateY(0);
                        }
                        
                        .result-container {
                            grid-column: 1 / -1;
                            margin-top: 20px;
                        }
                        
                        .result-box {
                            background: #0f172a;
                            color: #e2e8f0;
                            border-radius: 15px;
                            padding: 25px;
                            font-family: 'Courier New', monospace;
                            overflow-x: auto;
                            max-height: 500px;
                            overflow-y: auto;
                        }
                        
                        .result-box pre {
                            margin: 0;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                        
                        .loading {
                            display: none;
                            text-align: center;
                            padding: 20px;
                            color: #4f46e5;
                        }
                        
                        .loading.active {
                            display: block;
                        }
                        
                        .spinner {
                            border: 4px solid #f3f3f3;
                            border-top: 4px solid #4f46e5;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 15px;
                        }
                        
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                        
                        .icon {
                            font-size: 1.2rem;
                        }
                        
                        .status {
                            padding: 10px 15px;
                            border-radius: 8px;
                            margin-top: 15px;
                            font-weight: 500;
                            display: none;
                        }
                        
                        .status.success {
                            background: #10b981;
                            color: white;
                            display: block;
                        }
                        
                        .status.error {
                            background: #ef4444;
                            color: white;
                            display: block;
                        }
                        
                        .tabs {
                            display: flex;
                            gap: 10px;
                            margin-bottom: 30px;
                            border-bottom: 2px solid #e2e8f0;
                        }
                        
                        .tab {
                            padding: 15px 30px;
                            background: none;
                            border: none;
                            font-size: 1.1rem;
                            font-weight: 600;
                            color: #64748b;
                            cursor: pointer;
                            position: relative;
                            transition: all 0.3s ease;
                        }
                        
                        .tab.active {
                            color: #4f46e5;
                        }
                        
                        .tab.active::after {
                            content: '';
                            position: absolute;
                            bottom: -2px;
                            left: 0;
                            right: 0;
                            height: 3px;
                            background: #4f46e5;
                            border-radius: 3px 3px 0 0;
                        }
                        
                        .tab-content {
                            display: none;
                        }
                        
                        .tab-content.active {
                            display: block;
                        }
                        
                        .video-preview {
                            margin-top: 30px;
                            padding: 20px;
                            background: #f1f5f9;
                            border-radius: 10px;
                            border-left: 5px solid #4f46e5;
                        }
                        
                        .video-preview h3 {
                            color: #334155;
                            margin-bottom: 15px;
                        }
                        
                        .preview-grid {
                            display: grid;
                            grid-template-columns: 1fr 2fr;
                            gap: 20px;
                        }
                        
                        @media (max-width: 768px) {
                            .preview-grid {
                                grid-template-columns: 1fr;
                            }
                        }
                        
                        .thumbnail {
                            width: 100%;
                            height: 200px;
                            object-fit: cover;
                            border-radius: 10px;
                            background: #cbd5e1;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #64748b;
                        }
                        
                        .video-info {
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                        }
                        
                        .info-row {
                            display: flex;
                            gap: 10px;
                        }
                        
                        .info-label {
                            font-weight: 600;
                            color: #475569;
                            min-width: 120px;
                        }
                        
                        .info-value {
                            color: #334155;
                            flex: 1;
                        }
                    </style>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1><i class="fas fa-video"></i> Video Metadata Fetcher</h1>
                            <p>Automatically fetch video metadata from YouTube and websites. Store in JSON format with automatic channel organization.</p>
                        </div>
                        
                        <div class="main-content">
                            <div class="tabs">
                                <button class="tab active" onclick="switchTab('youtube')">
                                    <i class="fab fa-youtube"></i> YouTube Video
                                </button>
                                <button class="tab" onclick="switchTab('website')">
                                    <i class="fas fa-globe"></i> Website Video
                                </button>
                                <button class="tab" onclick="switchTab('manual')">
                                    <i class="fas fa-edit"></i> Manual Entry
                                </button>
                            </div>
                            
                            <!-- YouTube Tab -->
                            <div id="youtube-tab" class="tab-content active">
                                <div class="card">
                                    <h2><i class="fab fa-youtube"></i> Process YouTube Video</h2>
                                    <div class="form-group">
                                        <label for="youtube-url"><i class="fas fa-link"></i> YouTube Video URL</label>
                                        <input type="url" id="youtube-url" class="form-control" 
                                               placeholder="https://www.youtube.com/watch?v=..." 
                                               required>
                                    </div>
                                    <div class="form-group">
                                        <label for="website-url"><i class="fas fa-external-link-alt"></i> Your Website URL (Optional)</label>
                                        <input type="url" id="youtube-website-url" class="form-control" 
                                               placeholder="https://yourwebsite.com/video/...">
                                    </div>
                                    <button class="btn" onclick="processYouTubeVideo()">
                                        <i class="fas fa-magic"></i> Fetch & Process Video
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Website Tab -->
                            <div id="website-tab" class="tab-content">
                                <div class="card">
                                    <h2><i class="fas fa-globe"></i> Fetch Website Video Metadata</h2>
                                    <div class="form-group">
                                        <label for="website-video-url"><i class="fas fa-link"></i> Website Video URL</label>
                                        <input type="url" id="website-video-url" class="form-control" 
                                               placeholder="https://example.com/video-page" 
                                               required>
                                    </div>
                                    <button class="btn" onclick="fetchWebsiteMetadata()">
                                        <i class="fas fa-search"></i> Fetch Metadata
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Manual Tab -->
                            <div id="manual-tab" class="tab-content">
                                <div class="card">
                                    <h2><i class="fas fa-edit"></i> Manual Video Entry</h2>
                                    <div class="form-group">
                                        <label for="manual-channel"><i class="fas fa-user-circle"></i> Channel Name</label>
                                        <input type="text" id="manual-channel" class="form-control" 
                                               placeholder="Enter channel name" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="manual-title"><i class="fas fa-heading"></i> Video Title</label>
                                        <input type="text" id="manual-title" class="form-control" 
                                               placeholder="Enter video title" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="manual-website"><i class="fas fa-link"></i> Website URL</label>
                                        <input type="url" id="manual-website" class="form-control" 
                                               placeholder="https://yourwebsite.com/video/...">
                                    </div>
                                    <button class="btn" onclick="addManualVideo()">
                                        <i class="fas fa-plus-circle"></i> Add to Channel JSON
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Results Area -->
                            <div class="result-container">
                                <div class="loading" id="loading">
                                    <div class="spinner"></div>
                                    <p>Processing your request...</p>
                                </div>
                                
                                <div class="status" id="status"></div>
                                
                                <div id="video-preview" class="video-preview" style="display: none;">
                                    <h3><i class="fas fa-eye"></i> Video Preview</h3>
                                    <div class="preview-grid">
                                        <div class="thumbnail" id="preview-thumbnail">
                                            <i class="fas fa-image fa-3x"></i>
                                        </div>
                                        <div class="video-info">
                                            <div class="info-row">
                                                <span class="info-label">Title:</span>
                                                <span class="info-value" id="preview-title">N/A</span>
                                            </div>
                                            <div class="info-row">
                                                <span class="info-label">Channel:</span>
                                                <span class="info-value" id="preview-channel">N/A</span>
                                            </div>
                                            <div class="info-row">
                                                <span class="info-label">Duration:</span>
                                                <span class="info-value" id="preview-duration">N/A</span>
                                            </div>
                                            <div class="info-row">
                                                <span class="info-label">Views:</span>
                                                <span class="info-value" id="preview-views">N/A</span>
                                            </div>
                                            <div class="info-row">
                                                <span class="info-label">Description:</span>
                                                <span class="info-value" id="preview-description">N/A</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="result-box">
                                    <pre id="result">Results will appear here...</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        let currentVideoData = null;
                        
                        function switchTab(tabName) {
                            // Update tabs
                            document.querySelectorAll('.tab').forEach(tab => {
                                tab.classList.remove('active');
                            });
                            document.querySelectorAll('.tab-content').forEach(content => {
                                content.classList.remove('active');
                            });
                            
                            // Activate selected tab
                            event.target.classList.add('active');
                            document.getElementById(tabName + '-tab').classList.add('active');
                        }
                        
                        async function processYouTubeVideo() {
                            const youtubeUrl = document.getElementById('youtube-url').value;
                            const websiteUrl = document.getElementById('youtube-website-url').value;
                            
                            if (!youtubeUrl) {
                                showError('Please enter a YouTube URL');
                                return;
                            }
                            
                            showLoading();
                            clearResults();
                            
                            try {
                                // First fetch YouTube channel info
                                const response = await fetch('/api/process-youtube', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        youtubeUrl: youtubeUrl,
                                        websiteUrl: websiteUrl
                                    })
                                });
                                
                                const data = await response.json();
                                
                                if (data.success) {
                                    showSuccess('YouTube video processed successfully!');
                                    displayVideoPreview(data.videoData);
                                    displayResult(data);
                                    currentVideoData = data.videoData;
                                } else {
                                    showError(data.message || 'Failed to process YouTube video');
                                    displayResult(data);
                                }
                            } catch (error) {
                                showError('Error: ' + error.message);
                            } finally {
                                hideLoading();
                            }
                        }
                        
                        async function fetchWebsiteMetadata() {
                            const url = document.getElementById('website-video-url').value;
                            
                            if (!url) {
                                showError('Please enter a website URL');
                                return;
                            }
                            
                            showLoading();
                            clearResults();
                            
                            try {
                                const response = await fetch('/api/fetch-metadata', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ url: url })
                                });
                                
                                const data = await response.json();
                                
                                if (data.success) {
                                    showSuccess('Website metadata fetched successfully!');
                                    displayVideoPreview(data.metadata);
                                    displayResult(data);
                                    currentVideoData = data.metadata;
                                } else {
                                    showError(data.message || 'Failed to fetch metadata');
                                    displayResult(data);
                                }
                            } catch (error) {
                                showError('Error: ' + error.message);
                            } finally {
                                hideLoading();
                            }
                        }
                        
                        async function addManualVideo() {
                            const channel = document.getElementById('manual-channel').value;
                            const title = document.getElementById('manual-title').value;
                            const website = document.getElementById('manual-website').value;
                            
                            if (!channel || !title) {
                                showError('Channel name and video title are required');
                                return;
                            }
                            
                            showLoading();
                            clearResults();
                            
                            try {
                                const videoData = {
                                    channelName: channel,
                                    videoTitle: title,
                                    websiteUrl: website || '',
                                    description: "Manually added video",
                                    duration: "N/A",
                                    quality: "HD",
                                    category: "general",
                                    releaseYear: new Date().getFullYear(),
                                    thumbnail: "https://via.placeholder.com/300x200",
                                    views: 0,
                                    likes: 0
                                };
                                
                                const response = await fetch('/api/create-md', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        fileName: channel.toLowerCase().replace(/\\s+/g, '-') + '-videos',
                                        channelName: channel,
                                        videoData: videoData
                                    })
                                });
                                
                                const data = await response.json();
                                
                                if (data.success) {
                                    showSuccess('Video added to channel successfully!');
                                    displayResult(data);
                                    
                                    // Clear form
                                    document.getElementById('manual-channel').value = '';
                                    document.getElementById('manual-title').value = '';
                                    document.getElementById('manual-website').value = '';
                                } else {
                                    showError(data.message || 'Failed to add video');
                                    displayResult(data);
                                }
                            } catch (error) {
                                showError('Error: ' + error.message);
                            } finally {
                                hideLoading();
                            }
                        }
                        
                        function displayVideoPreview(videoData) {
                            const preview = document.getElementById('video-preview');
                            preview.style.display = 'block';
                            
                            // Update preview elements
                            document.getElementById('preview-title').textContent = 
                                videoData.title || videoData.videoTitle || 'N/A';
                            document.getElementById('preview-channel').textContent = 
                                videoData.channelName || videoData.channel || 'N/A';
                            document.getElementById('preview-duration').textContent = 
                                videoData.duration || 'N/A';
                            document.getElementById('preview-views').textContent = 
                                videoData.views || videoData.viewCount || '0';
                            document.getElementById('preview-description').textContent = 
                                videoData.description || videoData.metadata?.description || 'N/A';
                            
                            // Update thumbnail if available
                            const thumbnailEl = document.getElementById('preview-thumbnail');
                            if (videoData.thumbnail || videoData.metadata?.image) {
                                thumbnailEl.innerHTML = '';
                                const img = document.createElement('img');
                                img.src = videoData.thumbnail || videoData.metadata?.image;
                                img.alt = 'Video thumbnail';
                                img.style.width = '100%';
                                img.style.height = '100%';
                                img.style.objectFit = 'cover';
                                img.style.borderRadius = '10px';
                                thumbnailEl.appendChild(img);
                            }
                        }
                        
                        function displayResult(data) {
                            const resultEl = document.getElementById('result');
                            resultEl.textContent = JSON.stringify(data, null, 2);
                        }
                        
                        function showLoading() {
                            document.getElementById('loading').classList.add('active');
                        }
                        
                        function hideLoading() {
                            document.getElementById('loading').classList.remove('active');
                        }
                        
                        function showSuccess(message) {
                            const statusEl = document.getElementById('status');
                            statusEl.textContent = '✓ ' + message;
                            statusEl.className = 'status success';
                        }
                        
                        function showError(message) {
                            const statusEl = document.getElementById('status');
                            statusEl.textContent = '✗ ' + message;
                            statusEl.className = 'status error';
                        }
                        
                        function clearResults() {
                            const statusEl = document.getElementById('status');
                            statusEl.className = 'status';
                            statusEl.textContent = '';
                            
                            const preview = document.getElementById('video-preview');
                            preview.style.display = 'none';
                        }
                        
                        // Allow Enter key to submit forms
                        document.querySelectorAll('.form-control').forEach(input => {
                            input.addEventListener('keypress', function(e) {
                                if (e.key === 'Enter') {
                                    const activeTab = document.querySelector('.tab-content.active');
                                    if (activeTab.id === 'youtube-tab') {
                                        processYouTubeVideo();
                                    } else if (activeTab.id === 'website-tab') {
                                        fetchWebsiteMetadata();
                                    } else if (activeTab.id === 'manual-tab') {
                                        addManualVideo();
                                    }
                                }
                            });
                        });
                    </script>
                </body>
                </html>
            `, {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        return new Response('Not found', { status: 404 });
    }
};

// This endpoint now creates JSON files with video data
async function handleCreateChannelJson(request, env) {
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
        const { fileName, channelName, videoData } = data;
        
        if (!channelName) {
            return new Response(JSON.stringify({
                success: false,
                message: 'channelName is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Generate channel slug
        const channelSlug = channelName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        
        // Use video-1.json format (not videos-1.json)
        const jsonFileNumber = await getJsonFileNumber(channelSlug, env);
        const jsonFileName = fileName || `video-${jsonFileNumber}`;
        const jsonFilePath = `channels/${channelSlug}/${jsonFileName}.json`;
        
        // Get existing JSON or create new
        let videosArray = [];
        let sha = null;
        
        try {
            const existing = await getGitHubFile(jsonFilePath, env);
            videosArray = JSON.parse(existing.content);
            sha = existing.sha;
            console.log(`Loaded ${videosArray.length} videos from ${jsonFilePath}`);
        } catch (e) {
            console.log(`Creating new JSON file: ${jsonFilePath}`);
        }
        
        // Create video object
        const videoObject = {
            id: 'vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: videoData?.videoTitle || videoData?.title || 'Video Title',
            description: videoData?.description || '',
            category: videoData?.category || 'general',
            duration: videoData?.duration || '',
            quality: videoData?.quality || 'HD',
            releaseYear: videoData?.releaseYear || new Date().getFullYear(),
            websiteUrl: videoData?.websiteUrl || '',
            youtubeId: videoData?.youtubeId || '',
            youtubeUrl: videoData?.youtubeUrl || '',
            channelName: channelName,
            channelSlug: channelSlug,
            thumbnail: videoData?.thumbnail || '',
            views: videoData?.views || 0,
            likes: videoData?.likes || 0,
            uploadDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            metadata: videoData?.metadata || null
        };
        
        // Add to beginning (newest first)
        videosArray.unshift(videoObject);
        
        // Limit to 100 videos per file
        let nextFileNumber = jsonFileNumber;
        if (videosArray.length > 100) {
            videosArray = videosArray.slice(0, 100);
            nextFileNumber = jsonFileNumber + 1;
        }
        
        // Save JSON to GitHub
        const jsonContent = JSON.stringify(videosArray, null, 2);
        const saveResult = await saveToGitHub(jsonFilePath, jsonContent, env, sha);
        
        // Update channel index
        await updateChannelIndex(channelName, channelSlug, videoObject, env);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Video added to channel JSON',
            channelSlug: channelSlug,
            jsonFile: jsonFilePath,
            videoCount: videosArray.length,
            nextFile: videosArray.length >= 100 ? `video-${nextFileNumber}.json` : null,
            githubUrl: saveResult.content?.html_url,
            videoAdded: videoObject
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message,
            errorType: error.constructor.name
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

// New function to process YouTube videos
async function handleProcessYouTube(request, env) {
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
        const { youtubeUrl, websiteUrl } = data;
        
        if (!youtubeUrl) {
            return new Response(JSON.stringify({
                success: false,
                message: 'youtubeUrl is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Extract YouTube video ID
        const videoId = extractYouTubeId(youtubeUrl);
        if (!videoId) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Invalid YouTube URL'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Get channel info from YouTube RSS
        const channelInfo = await getYouTubeChannelFromRSS(videoId);
        
        if (!channelInfo) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Could not fetch channel info from YouTube'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Get video metadata
        const videoMetadata = await getYouTubeVideoMetadata(videoId);
        
        // Create video data object
        const videoData = {
            channelName: channelInfo.channelName,
            videoTitle: videoMetadata.title || 'YouTube Video',
            description: videoMetadata.description || '',
            duration: videoMetadata.duration || '',
            quality: 'HD',
            category: 'entertainment',
            releaseYear: new Date().getFullYear(),
            websiteUrl: websiteUrl || '',
            youtubeId: videoId,
            youtubeUrl: youtubeUrl,
            thumbnail: videoMetadata.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            views: videoMetadata.views || 0,
            likes: videoMetadata.likes || 0,
            channelId: channelInfo.channelId,
            channelUrl: `https://www.youtube.com/channel/${channelInfo.channelId}`,
            metadata: videoMetadata
        };
        
        // Save to channel JSON
        const saveResponse = await saveVideoToChannel(videoData, env);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'YouTube video processed and saved',
            channelInfo: channelInfo,
            videoMetadata: videoMetadata,
            videoData: videoData,
            saveResult: saveResponse
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
    } catch (error) {
        console.error('Error processing YouTube:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message,
            errorType: error.constructor.name
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

// Fetch website metadata
async function handleFetchMetadata(request, env) {
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
        const { url } = data;
        
        if (!url) {
            return new Response(JSON.stringify({
                success: false,
                message: 'URL is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Fetch and scrape the webpage
        const metadata = await scrapeWebsiteMetadata(url);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Metadata fetched successfully',
            url: url,
            metadata: metadata
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
    } catch (error) {
        console.error('Error fetching metadata:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

// Fetch YouTube channel info
async function handleFetchYouTubeChannel(request, env) {
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
        const { youtubeUrl } = data;
        
        if (!youtubeUrl) {
            return new Response(JSON.stringify({
                success: false,
                message: 'YouTube URL is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Extract YouTube video ID
        const videoId = extractYouTubeId(youtubeUrl);
        if (!videoId) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Invalid YouTube URL'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Get channel info from YouTube RSS
        const channelInfo = await getYouTubeChannelFromRSS(videoId);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'YouTube channel info fetched',
            youtubeUrl: youtubeUrl,
            videoId: videoId,
            channelInfo: channelInfo
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
    } catch (error) {
        console.error('Error fetching YouTube channel:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

// Helper: Extract YouTube ID from URL
function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1].split('?')[0].split('&')[0];
        }
    }
    
    return null;
}

// Helper: Get YouTube channel info from RSS (no API key needed)
async function getYouTubeChannelFromRSS(videoId) {
    try {
        // Get video info from oEmbed
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedResponse = await fetch(oembedUrl);
        
        if (oembedResponse.ok) {
            const oembedData = await oembedResponse.json();
            
            // Get channel ID from RSS feed
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?video_id=${videoId}`;
            const rssResponse = await fetch(rssUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (rssResponse.ok) {
                const rssText = await rssResponse.text();
                
                // Parse channel info from RSS
                const channelNameMatch = rssText.match(/<name>([^<]+)<\/name>/);
                const channelIdMatch = rssText.match(/<uri>yt:channel:([^<]+)<\/uri>/);
                
                return {
                    channelName: channelNameMatch ? channelNameMatch[1] : oembedData.author_name,
                    channelId: channelIdMatch ? channelIdMatch[1] : null,
                    authorName: oembedData.author_name,
                    authorUrl: oembedData.author_url,
                    title: oembedData.title,
                    thumbnail: oembedData.thumbnail_url
                };
            } else {
                // Fallback to oEmbed data only
                return {
                    channelName: oembedData.author_name,
                    channelId: null,
                    authorName: oembedData.author_name,
                    authorUrl: oembedData.author_url,
                    title: oembedData.title,
                    thumbnail: oembedData.thumbnail_url
                };
            }
        }
        
        // Alternative method: Use YouTube iframe API
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        const embedResponse = await fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (embedResponse.ok) {
            const embedHtml = await embedResponse.text();
            
            // Try to extract channel info from iframe page
            const channelMatch = embedHtml.match(/channel\/([^"']+)/);
            const titleMatch = embedHtml.match(/<title>([^<]+)<\/title>/);
            
            if (titleMatch) {
                const title = titleMatch[1].replace(' - YouTube', '').trim();
                return {
                    channelName: title.split('by ')[1] || 'Unknown Channel',
                    channelId: channelMatch ? channelMatch[1] : null,
                    authorName: title.split('by ')[1] || 'Unknown',
                    title: title.split('by ')[0] || 'YouTube Video'
                };
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('Error getting YouTube channel:', error);
        return null;
    }
}

// Helper: Get YouTube video metadata
async function getYouTubeVideoMetadata(videoId) {
    try {
        // Use YouTube iframe page to get metadata
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br'
            }
        });
        
        if (response.ok) {
            const html = await response.text();
            
            // Parse metadata from HTML
            const titleMatch = html.match(/"title":"([^"]+)"/) || html.match(/<title>([^<]+)<\/title>/);
            const descriptionMatch = html.match(/"shortDescription":"([^"]+)"/);
            const viewCountMatch = html.match(/"viewCount":"([^"]+)"/);
            const durationMatch = html.match(/"approxDurationMs":"([^"]+)"/);
            const thumbnailMatch = html.match(/"thumbnail":\{"thumbnails":\[\{"url":"([^"]+)"/);
            
            let duration = '';
            if (durationMatch) {
                const ms = parseInt(durationMatch[1]);
                const minutes = Math.floor(ms / 60000);
                const seconds = Math.floor((ms % 60000) / 1000);
                duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            return {
                title: titleMatch ? titleMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => 
                    String.fromCharCode(parseInt(grp, 16))) : 'YouTube Video',
                description: descriptionMatch ? descriptionMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => 
                    String.fromCharCode(parseInt(grp, 16))) : '',
                views: viewCountMatch ? parseInt(viewCountMatch[1]) : 0,
                duration: duration,
                thumbnail: thumbnailMatch ? thumbnailMatch[1] : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            };
        }
        
        return {
            title: 'YouTube Video',
            description: '',
            views: 0,
            duration: '',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };
        
    } catch (error) {
        console.error('Error getting YouTube metadata:', error);
        return {
            title: 'YouTube Video',
            description: '',
            views: 0,
            duration: '',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };
    }
}

// Helper: Scrape website metadata
async function scrapeWebsiteMetadata(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Parse metadata using regex
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descriptionMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) ||
                               html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
        const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i) ||
                          html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"[^>]*>/i);
        const videoMatch = html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]*)"[^>]*>/i) ||
                          html.match(/<meta[^>]*property="og:video:url"[^>]*content="([^"]*)"[^>]*>/i);
        
        return {
            url: url,
            title: titleMatch ? titleMatch[1].trim() : 'No title found',
            description: descriptionMatch ? descriptionMatch[1].trim() : '',
            image: imageMatch ? new URL(imageMatch[1].trim(), url).href : '',
            videoUrl: videoMatch ? new URL(videoMatch[1].trim(), url).href : '',
            scrapedAt: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Error scraping website:', error);
        return {
            url: url,
            title: 'Failed to fetch metadata',
            description: error.message,
            scrapedAt: new Date().toISOString()
        };
    }
}

// Helper: Save video to channel JSON
async function saveVideoToChannel(videoData, env) {
    const channelSlug = videoData.channelName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const jsonFileNumber = await getJsonFileNumber(channelSlug, env);
    const jsonFileName = `video-${jsonFileNumber}`;
    const jsonFilePath = `channels/${channelSlug}/${jsonFileName}.json`;
    
    // Get existing JSON or create new
    let videosArray = [];
    let sha = null;
    
    try {
        const existing = await getGitHubFile(jsonFilePath, env);
        videosArray = JSON.parse(existing.content);
        sha = existing.sha;
    } catch (e) {
        console.log(`Creating new JSON file: ${jsonFilePath}`);
    }
    
    // Create video object
    const videoObject = {
        id: 'vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        title: videoData.videoTitle,
        description: videoData.description,
        category: videoData.category,
        duration: videoData.duration,
        quality: videoData.quality,
        releaseYear: videoData.releaseYear,
        websiteUrl: videoData.websiteUrl,
        youtubeId: videoData.youtubeId,
        youtubeUrl: videoData.youtubeUrl,
        channelName: videoData.channelName,
        channelSlug: channelSlug,
        thumbnail: videoData.thumbnail,
        views: videoData.views,
        likes: videoData.likes,
        uploadDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        metadata: videoData.metadata
    };
    
    // Add to beginning (newest first)
    videosArray.unshift(videoObject);
    
    // Limit to 100 videos per file
    let nextFileNumber = jsonFileNumber;
    if (videosArray.length > 100) {
        videosArray = videosArray.slice(0, 100);
        nextFileNumber = jsonFileNumber + 1;
    }
    
    // Save JSON to GitHub
    const jsonContent = JSON.stringify(videosArray, null, 2);
    const saveResult = await saveToGitHub(jsonFilePath, jsonContent, env, sha);
    
    // Update channel index
    await updateChannelIndex(videoData.channelName, channelSlug, videoObject, env);
    
    return {
        success: true,
        channelSlug: channelSlug,
        jsonFile: jsonFilePath,
        videoCount: videosArray.length,
        githubUrl: saveResult.content?.html_url
    };
}

// Helper: Get next JSON file number (now uses video-1.json format)
async function getJsonFileNumber(channelSlug, env) {
    try {
        // Check if channel directory exists
        const response = await fetch(
            `https://api.github.com/repos/${env.GITHUB_REPO}/contents/channels/${channelSlug}`,
            {
                headers: {
                    'Authorization': `token ${env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Rwanda-Cinema'
                }
            }
        );
        
        if (response.ok) {
            const files = await response.json();
            // Look for video-*.json files (not videos-*.json)
            const jsonFiles = files.filter(f => f.name.startsWith('video-') && f.name.endsWith('.json'));
            
            if (jsonFiles.length === 0) return 1;
            
            // Get latest file
            const latestFile = jsonFiles.sort((a, b) => {
                const aNum = parseInt(a.name.match(/video-(\d+)\.json/)?.[1] || '0');
                const bNum = parseInt(b.name.match(/video-(\d+)\.json/)?.[1] || '0');
                return bNum - aNum;
            })[0];
            
            // Check if it has less than 100 videos
            try {
                const fileContent = await getGitHubFile(`channels/${channelSlug}/${latestFile.name}`, env);
                const videos = JSON.parse(fileContent.content);
                
                if (videos.length < 100) {
                    const match = latestFile.name.match(/video-(\d+)\.json/);
                    return match ? parseInt(match[1]) : 1;
                } else {
                    const match = latestFile.name.match(/video-(\d+)\.json/);
                    return match ? parseInt(match[1]) + 1 : 1;
                }
            } catch (e) {
                return 1;
            }
        }
    } catch (e) {
        // Channel doesn't exist
    }
    
    return 1;
}

// Helper: Get file from GitHub
async function getGitHubFile(path, env) {
    const response = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`,
        {
            headers: {
                'Authorization': `token ${env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Rwanda-Cinema'
            }
        }
    );
    
    if (!response.ok) {
        throw new Error(`GitHub file not found: ${path}`);
    }
    
    const data = await response.json();
    const content = atob(data.content.replace(/\n/g, ''));
    
    return {
        content: content,
        sha: data.sha
    };
}

// Helper: Save to GitHub
async function saveToGitHub(path, content, env, sha = null) {
    const contentBase64 = btoa(unescape(encodeURIComponent(content)));
    
    const response = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Rwanda-Cinema'
            },
            body: JSON.stringify({
                message: `Update ${path}`,
                content: contentBase64,
                branch: 'main',
                ...(sha && { sha })
            })
        }
    );
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API error: ${error.message}`);
    }
    
    return await response.json();
}

// Helper: Update channel index
async function updateChannelIndex(channelName, channelSlug, videoData, env) {
    const indexPath = 'channels/index.json';
    let indexData = { channels: [] };
    let sha = null;
    
    try {
        const existing = await getGitHubFile(indexPath, env);
        indexData = JSON.parse(existing.content);
        sha = existing.sha;
    } catch (e) {
        // Index doesn't exist, create new
    }
    
    // Find or create channel
    let channelIndex = indexData.channels.findIndex(c => c.slug === channelSlug);
    
    const channelInfo = {
        name: channelName,
        slug: channelSlug,
        description: `${channelName} - Rwandan Content`,
        totalVideos: 1,
        latestVideo: {
            title: videoData.title,
            url: videoData.websiteUrl || videoData.youtubeUrl || '',
            date: videoData.uploadDate,
            thumbnail: videoData.thumbnail
        },
        categories: [videoData.category],
        lastUpdated: new Date().toISOString(),
        created: new Date().toISOString()
    };
    
    if (channelIndex !== -1) {
        // Update existing
        const existing = indexData.channels[channelIndex];
        indexData.channels[channelIndex] = {
            ...existing,
            totalVideos: existing.totalVideos + 1,
            latestVideo: channelInfo.latestVideo,
            categories: [...new Set([...existing.categories, videoData.category])],
            lastUpdated: new Date().toISOString()
        };
    } else {
        // Add new channel
        indexData.channels.push(channelInfo);
    }
    
    // Save index
    try {
        await saveToGitHub(indexPath, JSON.stringify(indexData, null, 2), env, sha);
    } catch (e) {
        console.warn('Failed to update index:', e.message);
        // Don't fail the whole process if index update fails
    }
}
