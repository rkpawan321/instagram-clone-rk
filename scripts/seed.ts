import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();


async function main() {
  console.log('🌱 Starting database seed...');

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { id: 'demo-user-1' },
    update: {},
    create: {
      id: 'demo-user-1',
      name: 'Demo User',
    },
  });

  console.log('👤 Created demo user:', user.name);

  // Clear existing videos first
  console.log('🗑️ Clearing existing videos...');
  await prisma.video.deleteMany({});
  
  // Create videos for ALL images in the archive (8091 images)
  const imagesDir = path.join(process.cwd(), 'public', 'archive', 'Images');
  const allImageFiles = fs.readdirSync(imagesDir).filter((file: string) => file.endsWith('.jpg'));
  const totalVideos = allImageFiles.length; // Use all 8091 images
  
  // Load real Flickr8k captions
  const captionsPath = path.join(process.cwd(), 'public', 'archive', 'captions.txt');
  const captionsContent = fs.readFileSync(captionsPath, 'utf-8');
  const captionsLines = captionsContent.split('\n').slice(1); // Skip header
  
  // Create a map of image filename to captions
  const imageCaptions = new Map();
  captionsLines.forEach(line => {
    if (line.trim()) {
      const [imageName, caption] = line.split(',');
      if (imageName && caption) {
        if (!imageCaptions.has(imageName)) {
          imageCaptions.set(imageName, []);
        }
        imageCaptions.get(imageName).push(caption.trim());
      }
    }
  });
  
  const videos = [];
  for (let i = 0; i < totalVideos; i++) {
    const imageFile = allImageFiles[i];
    const imageCaptionsList = imageCaptions.get(imageFile) || [];
    
    // Use the first caption for this image, or fallback to a simple default
    const description = imageCaptionsList.length > 0 
      ? imageCaptionsList[0] 
      : `A beautiful image from the Flickr8k dataset`;
    
    const title = `Video ${i + 1}`;
    const thumbnail = `/archive/Images/${imageFile}`;
    
    const video = await prisma.video.create({
      data: {
        title,
        description,
        thumbnail,
        url: null, // No actual video URLs for now
      },
    });
    
    videos.push(video);
    console.log(`📹 Created video ${i + 1}: ${title}`);
  }

  console.log(`✅ Successfully seeded ${videos.length} videos!`);
  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
