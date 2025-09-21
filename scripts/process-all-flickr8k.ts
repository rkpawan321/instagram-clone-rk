import { PrismaClient } from '@prisma/client';
import { embeddingService } from '../src/lib/embeddings';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function processAllFlickr8k() {
  console.log('🖼️ Processing all 8,091 Flickr8k images...');

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
  
  // Process all images that have captions
  const allImages = imageFiles.filter(file => captionMap.has(file));
  console.log(`🖼️ Processing ${allImages.length} images...`);

  // Process images and create videos (without embeddings first)
  const videos = [];
  let processed = 0;

  console.log('📝 Creating video records...');
  for (const imageFile of allImages) {
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

    if (processed % 500 === 0) {
      console.log(`✅ Created ${processed}/${allImages.length} videos...`);
    }
  }

  console.log(`🎉 Successfully created ${videos.length} videos!`);

  // Generate embeddings for all videos in batches
  console.log('🔮 Generating embeddings for all videos...');
  
  const videosWithoutEmbeddings = await prisma.video.findMany({
    where: { embedding: null },
    select: { id: true, title: true, description: true }
  });

  console.log(`📊 Generating embeddings for ${videosWithoutEmbeddings.length} videos...`);

  // Process in smaller batches to avoid rate limiting
  const batchSize = 5; // Smaller batches for large dataset
  let embeddingProcessed = 0;
  let successfulEmbeddings = 0;

  for (let i = 0; i < videosWithoutEmbeddings.length; i += batchSize) {
    const batch = videosWithoutEmbeddings.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(videosWithoutEmbeddings.length / batchSize);
    
    console.log(`🔄 Processing embedding batch ${batchNumber}/${totalBatches} (${batch.length} videos)`);

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
    successfulEmbeddings += successful;
    embeddingProcessed += batch.length;

    console.log(`✅ Embedding batch ${batchNumber} completed: ${successful}/${batch.length} successful`);
    console.log(`📊 Progress: ${embeddingProcessed}/${videosWithoutEmbeddings.length} videos processed (${Math.round((embeddingProcessed / videosWithoutEmbeddings.length) * 100)}%)`);
    
    // Longer delay between batches for large dataset
    if (i + batchSize < videosWithoutEmbeddings.length) {
      console.log('⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`🎉 All Flickr8k processing completed!`);
  console.log(`📊 Final stats:`);
  console.log(`   - Videos created: ${videos.length}`);
  console.log(`   - Embeddings generated: ${successfulEmbeddings}`);
  console.log(`   - Success rate: ${Math.round((successfulEmbeddings / videosWithoutEmbeddings.length) * 100)}%`);
}

processAllFlickr8k()
  .catch((e) => {
    console.error('❌ Error during Flickr8k processing:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
