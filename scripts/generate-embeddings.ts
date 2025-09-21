import { PrismaClient } from '@prisma/client';
import { embeddingService } from '../src/lib/embeddings';

const prisma = new PrismaClient();

async function main() {
  console.log('🔮 Starting embedding generation...');

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

  // Generate embeddings for each video
  for (let i = 0; i < videosWithoutEmbeddings.length; i++) {
    const video = videosWithoutEmbeddings[i];
    
    try {
      console.log(`🔄 Processing ${i + 1}/${videosWithoutEmbeddings.length}: ${video.title}`);
      
      // Combine title and description for embedding
      const textToEmbed = `${video.title} ${video.description}`;
      
      // Generate embedding
      const embedding = await embeddingService.generateEmbedding(textToEmbed);
      
      // Store in database
      await prisma.video.update({
        where: { id: video.id },
        data: { embedding: JSON.stringify(embedding) }
      });
      
      console.log(`✅ Generated embedding for: ${video.title}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Error processing ${video.title}:`, error);
    }
  }

  console.log('🎉 Embedding generation completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during embedding generation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });