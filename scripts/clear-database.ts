import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️ Clearing all video records...');
  
  // Delete all videos
  const deletedVideos = await prisma.video.deleteMany({});
  console.log(`✅ Deleted ${deletedVideos.count} videos`);
  
  // Delete all interactions
  const deletedInteractions = await prisma.interaction.deleteMany({});
  console.log(`✅ Deleted ${deletedInteractions.count} interactions`);
  
  // Delete all custom inputs
  const deletedCustomInputs = await prisma.customInput.deleteMany({});
  console.log(`✅ Deleted ${deletedCustomInputs.count} custom inputs`);
  
  console.log('🎉 Database cleared successfully!');
}

clearDatabase()
  .catch((e) => {
    console.error('❌ Error clearing database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
