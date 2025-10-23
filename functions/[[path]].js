// Add this to your existing Cloudflare Worker file
async function handleVideoUpload(request, env) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video');
    const thumbnailFile = formData.get('thumbnail');
    const title = formData.get('title');
    const category = formData.get('category');
    const description = formData.get('description');
    const language = formData.get('language') || 'Kinyarwanda';
    const quality = formData.get('quality') || '1080p';
    const releaseYear = formData.get('releaseYear') || new Date().getFullYear();
    const duration = formData.get('duration') || '28 minutes';

    if (!videoFile || !title || !category) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: video, title, category'
      }), { status: 400 });
    }

    // Generate unique filenames
    const timestamp = Date.now();
    const videoSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const videoFileName = `${videoSlug}-${timestamp}.mp4`;
    const thumbnailFileName = `${videoSlug}-thumbnail-${timestamp}.jpg`;

    // Upload video to Bunny.net
    const videoUrl = await uploadToBunny(videoFile, videoFileName, env);
    
    // Upload thumbnail if provided
    let thumbnailUrl = '';
    if (thumbnailFile) {
      thumbnailUrl = await uploadToBunny(thumbnailFile, thumbnailFileName, env);
    }

    // Generate markdown content for easy copy-paste
    const markdownContent = generateMarkdown({
      title,
      category,
      slug: videoSlug,
      description,
      language,
      quality,
      releaseYear,
      duration,
      videoUrl,
      thumbnailUrl
    });

    return new Response(JSON.stringify({
      success: true,
      videoUrl,
      thumbnailUrl: thumbnailUrl || 'https://inyarwanda-films.pages.dev/images/default-poster.jpg',
      markdown: markdownContent,
      details: {
        title,
        category,
        slug: videoSlug,
        videoFileName,
        thumbnailFileName
      }
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
    throw new Error(`Bunny.net upload failed: ${uploadResponse.status}`);
  }

  return `https://${env.BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`;
}

function generateMarkdown(data) {
  return `---
title: "${data.title.replace(/"/g, '\\"')}"
category: "${data.category}"
slug: "${data.slug}"
videoUrl: "${data.videoUrl}"
posterUrl: "${data.thumbnailUrl}"
description: "${data.description.replace(/"/g, '\\"')}"
language: "${data.language}"
quality: "${data.quality}"
releaseYear: ${data.releaseYear}
duration: "${data.duration}"
date: "${new Date().toISOString().split('T')[0]}"
---

${data.description}
`;
}
