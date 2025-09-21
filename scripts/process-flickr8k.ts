import { PrismaClient } from '@prisma/client';
import { embeddingService } from '../src/lib/embeddings';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface CaptionData {
  image: string;
  caption: string;
}

async function processFlickr8k() {
  console.log('🖼️ Processing Flickr8k dataset...');

  // Read captions file
  const captionsPath = path.join(process.cwd(), 'public/archive/captions.txt');
  const captionsContent = fs.readFileSync(captionsPath, 'utf-8');
  
  // Parse captions
  const lines = captionsContent.split('\n').slice(1); // Skip header
  const captionMap = new Map<string, string[]>();
  
  for (const line of lines) {
    if (line.trim()) {
      const [image, caption] = line.split(',');
      if (image && caption) {
        if (!captionMap.has(image)) {
          captionMap.set(image, []);
        }
        captionMap.get(image)!.push(caption.trim());
      }
    }
  }

  console.log(`📊 Found ${captionMap.size} images with captions`);

  // Clear existing videos
  console.log('🗑️ Clearing existing videos...');
  await prisma.video.deleteMany({});

  // Process images and create videos
  const imagesDir = path.join(process.cwd(), 'public/archive/Images');
  const imageFiles = fs.readdirSync(imagesDir).filter(file => file.endsWith('.jpg'));
  
  console.log(`🖼️ Processing ${imageFiles.length} images...`);

  const videos = [];
  let processed = 0;

  for (const imageFile of imageFiles) {
    const imageName = imageFile;
    const captions = captionMap.get(imageName) || [];
    
    if (captions.length === 0) {
      console.log(`⚠️ No captions found for ${imageName}, skipping...`);
      continue;
    }

    // Use the first caption as the main description
    const mainCaption = captions[0];
    const allCaptions = captions.join(' ');
    
    // Create video record
    const video = await prisma.video.create({
      data: {
        title: `Flickr8k Image ${processed + 1}`,
        description: mainCaption,
        thumbnail: `/archive/Images/${imageName}`, // Local path
        url: null,
      },
    });

    videos.push(video);
    processed++;

    if (processed % 100 === 0) {
      console.log(`✅ Processed ${processed}/${imageFiles.length} images...`);
    }
  }

  console.log(`🎉 Successfully processed ${videos.length} images!`);

  // Generate embeddings for all videos
  console.log('🔮 Generating embeddings...');
  
  const videosWithoutEmbeddings = await prisma.video.findMany({
    where: { embedding: null },
    select: { id: true, title: true, description: true }
  });

  console.log(`📊 Generating embeddings for ${videosWithoutEmbeddings.length} videos...`);

  for (let i = 0; i < videosWithoutEmbeddings.length; i++) {
    const video = videosWithoutEmbeddings[i];
    
    try {
      console.log(`🔄 Processing ${i + 1}/${videosWithoutEmbeddings.length}: ${video.title}`);
      
      // Generate embedding for description
      const embedding = await embeddingService.generateEmbedding(video.description);
      
      // Store in database
      await prisma.video.update({
        where: { id: video.id },
        data: { embedding: JSON.stringify(embedding) }
      });
      
      console.log(`✅ Generated embedding for: ${video.title}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing ${video.title}:`, error);
    }
  }

  console.log('🎉 Flickr8k processing completed!');
}

processFlickr8k()
  .catch((e) => {
    console.error('❌ Error during Flickr8k processing:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
