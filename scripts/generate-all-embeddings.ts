import { PrismaClient } from '@prisma/client';
import { embeddingService } from '../src/lib/embeddings';

const prisma = new PrismaClient();

async function generateAllEmbeddings() {
  console.log('🔮 Generating embeddings for all videos...');

  // Check if OpenAI is available
  if (!embeddingService.isAvailable()) {
    console.error('❌ OpenAI API key not configured. Please set OPENAI_API_KEY in .env');
    process.exit(1);
  }

  // Get all videos without embeddings
  const videosWithoutEmbeddings = await prisma.video.findMany({
    where: { embedding: null },
    select: { id: true, title: true, description: true }
  });

  if (videosWithoutEmbeddings.length === 0) {
    console.log('✅ All videos already have embeddings!');
    return;
  }

  console.log(`📊 Found ${videosWithoutEmbeddings.length} videos without embeddings`);

  // Generate embeddings in batches
  const batchSize = 10;
  let processed = 0;

  for (let i = 0; i < videosWithoutEmbeddings.length; i += batchSize) {
    const batch = videosWithoutEmbeddings.slice(i, i + batchSize);
    
    console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(videosWithoutEmbeddings.length / batchSize)} (${processed + 1}-${Math.min(processed + batchSize, videosWithoutEmbeddings.length)})`);

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
    processed += batch.length;

    console.log(`✅ Batch completed: ${successful}/${batch.length} successful`);
    
    // Delay between batches to avoid rate limiting
    if (i + batchSize < videosWithoutEmbeddings.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`🎉 Embedding generation completed! Processed ${processed} videos.`);
}

generateAllEmbeddings()
  .catch((e) => {
    console.error('❌ Error during embedding generation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
