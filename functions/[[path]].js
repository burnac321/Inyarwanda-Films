// Simple upload handler for the basic form
async function handleVideoUpload(request, env) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video');
    const thumbnailFile = formData.get('thumbnail');
    const title = formData.get('title');
    const slug = formData.get('slug') || title.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (!videoFile || !thumbnailFile || !title) {
      return new Response(JSON.stringify({
        success: false,
        error: 'All fields are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate filenames
    const timestamp = Date.now();
    const videoFileName = `videos/${slug}-${timestamp}.mp4`;
    const thumbnailFileName = `thumbnails/${slug}-${timestamp}.jpg`;

    // Upload files to Bunny.net
    const videoUrl = await uploadToBunny(videoFile, videoFileName, env);
    const thumbnailUrl = await uploadToBunny(thumbnailFile, thumbnailFileName, env);

    return new Response(JSON.stringify({
      success: true,
      videoUrl,
      thumbnailUrl,
      slug: slug
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function uploadToBunny(file, fileName, env) {
  const uploadResponse = await fetch(
    `https://storage.bunnycdn.com/${env.BUNNY_STORAGE_ZONE}/${fileName}`,
    {
      method: 'PUT',
      headers: {
        'AccessKey': env.BUNNY_API_KEY,
        'Content-Type': file.type
      },
      body: file
    }
  );

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.status}`);
  }

  return `https://${env.BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`;
        }
