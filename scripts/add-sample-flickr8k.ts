import { PrismaClient } from '@prisma/client';
import { embeddingService } from '../src/lib/embeddings';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface CaptionData {
  image: string;
  caption: string;
}

async function addSampleFlickr8k() {
  console.log('🖼️ Adding 1000 sample images from Flickr8k...');

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

  // Get available images
  const imagesDir = path.join(process.cwd(), 'public/archive/Images');
  const imageFiles = fs.readdirSync(imagesDir).filter(file => file.endsWith('.jpg'));
  
  // Take first 1000 images that have captions
  const sampleImages = [];
  for (const imageFile of imageFiles) {
    if (captionMap.has(imageFile)) {
      sampleImages.push(imageFile);
      if (sampleImages.length >= 1000) break;
    }
  }

  console.log(`🖼️ Processing ${sampleImages.length} sample images...`);

  // Process images and create videos
  const videos = [];
  let processed = 0;

  for (const imageFile of sampleImages) {
    const captions = captionMap.get(imageFile) || [];
    const mainCaption = captions[0]; // Use first caption
    
    // Create video record
    const video = await prisma.video.create({
      data: {
        title: `Flickr8k Image ${processed + 1}`,
        description: mainCaption,
        thumbnail: `/archive/Images/${imageFile}`, // Local path
        url: null,
      },
    });

    videos.push(video);
    processed++;

    if (processed % 100 === 0) {
      console.log(`✅ Created ${processed}/${sampleImages.length} videos...`);
    }
  }

  console.log(`🎉 Successfully created ${videos.length} videos!`);

  // Generate embeddings for all videos
  console.log('🔮 Generating embeddings...');
  
  const videosWithoutEmbeddings = await prisma.video.findMany({
    where: { embedding: null },
    select: { id: true, title: true, description: true }
  });

  console.log(`📊 Generating embeddings for ${videosWithoutEmbeddings.length} videos...`);

  // Process in batches of 10 to avoid rate limiting
  const batchSize = 10;
  let embeddingProcessed = 0;

  for (let i = 0; i < videosWithoutEmbeddings.length; i += batchSize) {
    const batch = videosWithoutEmbeddings.slice(i, i + batchSize);
    
    console.log(`🔄 Processing embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(videosWithoutEmbeddings.length / batchSize)}`);

    // Process batch in parallel
    const promises = batch.map(async (video) => {
      try {
        const embedding = await embeddingService.generateEmbedding(video.description);
        
        await prisma.video.update({
          where: { id: video.id },
          data: { embedding: JSON.stringify(embedding) }
        });
        
        return { success: true, title: video.title };
      } catch (error) {
        console.error(`❌ Error processing ${video.title}:`, error);
        return { success: false, title: video.title, error };
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    embeddingProcessed += batch.length;

    console.log(`✅ Embedding batch completed: ${successful}/${batch.length} successful`);
    
    // Delay between batches to avoid rate limiting
    if (i + batchSize < videosWithoutEmbeddings.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`🎉 Sample Flickr8k processing completed!`);
  console.log(`📊 Final stats:`);
  console.log(`   - Videos created: ${videos.length}`);
  console.log(`   - Embeddings generated: ${embeddingProcessed}`);
}

addSampleFlickr8k()
  .catch((e) => {
    console.error('❌ Error during sample Flickr8k processing:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
