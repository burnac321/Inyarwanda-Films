export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle upload API route
  if (request.method === 'POST' && path === '/upload') {
    return handleVideoUpload(request, env);
  }

  // Serve the upload page
  if (path === '/upload' || path === '/upload.html') {
    return serveUploadPage();
  }

  // For any other route, show simple message
  return new Response(JSON.stringify({
    message: 'Video Upload API is running',
    endpoints: {
      upload: 'POST /upload',
      uploadPage: 'GET /upload'
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Serve the upload HTML page
function serveUploadPage() {
  const html = `
<!DOCTYPE html>
<html lang="rw">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Upload - Inyarwanda Films</title>
    <style>
        :root { --primary: #008753; --secondary: #FAD201; --dark: #0a0a0a; --card-bg: #1a1a1a; --border: #333; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: var(--dark); color: white; font-family: system-ui; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 2rem; }
        .logo { color: var(--secondary); font-size: 2rem; font-weight: bold; }
        .upload-form { background: var(--card-bg); padding: 2rem; border-radius: 12px; border: 1px solid var(--border); }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; color: var(--secondary); font-weight: bold; }
        input { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 6px; background: #2a2a2a; color: white; }
        .file-input { background: #333; padding: 10px; }
        .submit-btn { background: var(--primary); color: white; padding: 15px 30px; border: none; border-radius: 6px; font-size: 1.1rem; cursor: pointer; width: 100%; }
        .submit-btn:hover { background: #006641; }
        .submit-btn:disabled { background: #555; cursor: not-allowed; }
        .loading { display: none; text-align: center; margin: 1rem 0; }
        .spinner { border: 3px solid #333; border-top: 3px solid var(--secondary); border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto; }
        .results { display: none; background: var(--card-bg); padding: 2rem; border-radius: 12px; margin-top: 2rem; border: 1px solid var(--primary); }
        .success-badge { background: var(--primary); color: white; padding: 0.5rem 1rem; border-radius: 20px; display: inline-block; margin-bottom: 1rem; }
        .url-box { background: #2a2a2a; padding: 1rem; border-radius: 6px; margin: 1rem 0; border-left: 4px solid var(--secondary); }
        .url-label { color: var(--secondary); font-size: 0.9rem; margin-bottom: 0.5rem; }
        .url-value { word-break: break-all; font-family: monospace; background: #1a1a1a; padding: 0.5rem; border-radius: 4px; }
        .copy-btn { background: var(--secondary); color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 0.5rem; font-weight: bold; }
        .copy-btn:hover { background: #e6c301; }
        .preview-container { display: none; margin-top: 1rem; }
        .preview-title { color: var(--secondary); margin-bottom: 0.5rem; font-weight: bold; }
        .video-preview { width: 100%; max-height: 200px; border-radius: 8px; background: #000; }
        .thumbnail-preview { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; }
        .file-info { background: #2a2a2a; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; font-size: 0.9rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎬 Upload to Bunny.net</div>
            <p>Upload videos and thumbnails directly to Bunny.net storage</p>
        </div>

        <form id="uploadForm" class="upload-form" enctype="multipart/form-data">
            <div class="form-group">
                <label for="title">Video Title *</label>
                <input type="text" id="title" name="title" placeholder="Enter video title" required>
            </div>

            <div class="form-group">
                <label for="video">Video File (MP4) *</label>
                <input type="file" id="video" name="video" accept="video/mp4" class="file-input" required>
                <div class="preview-container" id="videoPreview">
                    <div class="preview-title">Video Preview:</div>
                    <video class="video-preview" controls id="videoPreviewPlayer"></video>
                    <div class="file-info" id="videoInfo"></div>
                </div>
            </div>

            <div class="form-group">
                <label for="thumbnail">Thumbnail Image *</label>
                <input type="file" id="thumbnail" name="thumbnail" accept="image/jpeg,image/png,image/webp" class="file-input" required>
                <div class="preview-container" id="thumbnailPreview">
                    <div class="preview-title">Thumbnail Preview:</div>
                    <img class="thumbnail-preview" id="thumbnailPreviewImg" src="#" alt="Thumbnail preview">
                    <div class="file-info" id="thumbnailInfo"></div>
                </div>
            </div>

            <button type="submit" class="submit-btn" id="submitBtn">Upload to Bunny.net</button>
        </form>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Uploading to Bunny.net... This may take a few minutes</p>
        </div>

        <div class="results" id="results">
            <div class="success-badge">✅ Upload Successful!</div>
            <h3>📹 Video URL:</h3>
            <div class="url-box">
                <div class="url-value" id="videoUrl"></div>
                <button class="copy-btn" onclick="copyToClipboard('videoUrl')">Copy Video URL</button>
            </div>
            <h3>🖼️ Thumbnail URL:</h3>
            <div class="url-box">
                <div class="url-value" id="thumbnailUrl"></div>
                <button class="copy-btn" onclick="copyToClipboard('thumbnailUrl')">Copy Thumbnail URL</button>
            </div>
        </div>
    </div>

    <script>
        // File previews
        document.getElementById('video').addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('videoPreview');
            const videoPlayer = document.getElementById('videoPreviewPlayer');
            const videoInfo = document.getElementById('videoInfo');
            if (file) {
                const url = URL.createObjectURL(file);
                videoPlayer.src = url;
                preview.style.display = 'block';
                const fileSize = (file.size / (1024 * 1024)).toFixed(2);
                videoInfo.textContent = \`File: \${file.name} | Size: \${fileSize} MB\`;
            } else {
                preview.style.display = 'none';
            }
        });

        document.getElementById('thumbnail').addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('thumbnailPreview');
            const img = document.getElementById('thumbnailPreviewImg');
            const thumbnailInfo = document.getElementById('thumbnailInfo');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    img.src = e.target.result;
                    preview.style.display = 'block';
                    const fileSize = (file.size / (1024)).toFixed(2);
                    thumbnailInfo.textContent = \`File: \${file.name} | Size: \${fileSize} KB\`;
                }
                reader.readAsDataURL(file);
            } else {
                preview.style.display = 'none';
            }
        });

        // Form submission
        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const results = document.getElementById('results');
            
            submitBtn.disabled = true;
            loading.style.display = 'block';
            results.style.display = 'none';

            try {
                const formData = new FormData(this);
                const response = await fetch('/upload', { method: 'POST', body: formData });
                const data = await response.json();

                if (data.success) {
                    document.getElementById('videoUrl').textContent = data.videoUrl;
                    document.getElementById('thumbnailUrl').textContent = data.thumbnailUrl;
                    results.style.display = 'block';
                    document.getElementById('uploadForm').reset();
                    document.getElementById('videoPreview').style.display = 'none';
                    document.getElementById('thumbnailPreview').style.display = 'none';
                } else {
                    alert('Upload failed: ' + data.error);
                }
            } catch (error) {
                alert('Upload error: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                loading.style.display = 'none';
            }
        });

        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent;
            navigator.clipboard.writeText(text).then(() => {
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = '✅ Copied!';
                setTimeout(() => { btn.textContent = originalText; }, 2000);
            });
        }
    </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Handle video upload to Bunny.net
async function handleVideoUpload(request, env) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video');
    const thumbnailFile = formData.get('thumbnail');
    const title = formData.get('title');

    // Validate
    if (!videoFile || !thumbnailFile || !title) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Video, thumbnail and title are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate Bunny.net filenames
    const timestamp = Date.now();
    const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const videoFileName = `videos/${slug}-${timestamp}.mp4`;
    const thumbnailFileName = `thumbnails/${slug}-${timestamp}.jpg`;

    // Upload to Bunny.net
    const videoUrl = await uploadToBunny(videoFile, videoFileName, env);
    const thumbnailUrl = await uploadToBunny(thumbnailFile, thumbnailFileName, env);

    return new Response(JSON.stringify({
      success: true,
      videoUrl,
      thumbnailUrl,
      message: 'Video uploaded to Bunny.net successfully!'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Upload failed: ' + error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Upload to Bunny.net
async function uploadToBunny(file, fileName, env) {
  const BUNNY_API_KEY = env.BUNNY_API_KEY;
  const BUNNY_STORAGE_ZONE = env.BUNNY_STORAGE_ZONE;

  const uploadResponse = await fetch(
    `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${fileName}`,
    {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': file.type
      },
      body: file
    }
  );

  if (!uploadResponse.ok) {
    throw new Error(`Bunny.net upload failed: ${uploadResponse.status}`);
  }

  return `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`;
}
