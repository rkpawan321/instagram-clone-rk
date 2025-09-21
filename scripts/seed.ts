import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Diverse video descriptions across multiple categories - More specific and descriptive
const videoDescriptions = [
  // Nature & Landscapes (20) - More detailed and specific
  "Majestic sunset over snow-capped Himalayan peaks with golden alpenglow illuminating the mountain faces",
  "Powerful ocean waves crashing against dramatic black basalt cliffs in Iceland with spray reaching 50 feet high",
  "Dense Amazon rainforest canopy with shafts of sunlight piercing through 200-foot tall trees and hanging vines",
  "Serene mountain lake in the Canadian Rockies with perfect mirror reflection of surrounding pine forests",
  "Thundering Niagara Falls with massive water volume cascading over limestone cliffs creating rainbow mist",
  "Vast Sahara desert sand dunes at sunrise with camel caravans silhouetted against the orange sky",
  "Spectacular Northern Lights aurora borealis dancing in green and purple waves across the Arctic night sky",
  "Cherry blossom season in Japan with pink petals falling like snow in a traditional temple garden",
  "Active Hawaiian volcano with glowing red lava flowing down black volcanic slopes into the ocean",
  "Massive glacier calving event in Greenland with ice chunks the size of buildings crashing into turquoise waters",
  "Colorful wildflower meadow in the Swiss Alps with alpine flowers blooming in a high mountain valley",
  "Ancient redwood forest in California with trees over 300 feet tall and 2000 years old",
  "Vibrant coral reef in the Great Barrier Reef with schools of tropical fish swimming among colorful coral formations",
  "Frozen lake in Finland with Northern Lights reflecting perfectly in the ice creating a magical winter scene",
  "Crystal clear mountain stream flowing over smooth rocks with sunlight creating dancing patterns on the water",
  "Dramatic storm clouds gathering over the Great Plains with lightning illuminating the vast prairie landscape",
  "Autumn forest in New England with brilliant red, orange, and yellow leaves swirling in a gentle breeze",
  "Double rainbow arching over a misty Scottish valley after a brief rain shower",
  "Underground limestone cave with massive stalactites and stalagmites illuminated by soft lighting",
  "Tropical beach in the Maldives with crystal clear turquoise water and pristine white sand at sunrise",

  // Urban & City Life (20) - More specific and engaging
  "Bustling Times Square at night with massive LED billboards and crowds of tourists taking photos",
  "Modern glass skyscrapers in Dubai with the Burj Khalifa towering over the city skyline against a clear blue sky",
  "Busy Tokyo subway station during rush hour with hundreds of commuters in business suits boarding trains",
  "Colorful street art mural covering an entire building wall in Berlin's Kreuzberg district",
  "Trendy coffee shop in Seattle with baristas crafting latte art while customers work on laptops",
  "Iconic yellow taxi cabs navigating through Manhattan traffic with the Empire State Building in the background",
  "Rooftop garden in Brooklyn with urban farmers tending to vegetables while overlooking the Manhattan skyline",
  "Construction site in Shanghai with massive cranes building the world's tallest buildings",
  "Night market in Bangkok with food vendors cooking pad thai and serving fresh coconut water to tourists",
  "Central Park in New York with joggers, dog walkers, and families enjoying a sunny afternoon",
  "Golden Gate Bridge spanning San Francisco Bay with fog rolling in from the Pacific Ocean",
  "Graffiti-covered alley in Melbourne with vibrant street art and local artists working on new pieces",
  "Shopping district in Tokyo's Shibuya with thousands of pedestrians crossing the famous scramble intersection",
  "Apartment buildings in Hong Kong with thousands of lit windows creating a mesmerizing grid pattern at dusk",
  "Street performer in Paris playing classical violin near the Eiffel Tower with tourists dropping coins",
  "Food truck festival in Austin with dozens of trucks serving gourmet tacos, BBQ, and craft beer",
  "Protected bike lane in Amsterdam with hundreds of cyclists commuting to work in a well-organized flow",
  "Public square in Barcelona with locals and tourists enjoying the fountain while street musicians perform",
  "Underground metro station in Moscow with ornate architecture and commuters waiting for the next train",
  "City skyline of Chicago at sunset with the Willis Tower and other skyscrapers silhouetted against orange sky",

  // Lifestyle & Daily Activities (20) - More specific and relatable
  "Artisanal coffee brewing with a Chemex pour-over method, steam rising from freshly ground beans in a modern kitchen",
  "Sunrise yoga session on a wooden deck overlooking a peaceful garden with birds chirping in the background",
  "Handmade pasta preparation in a rustic Italian kitchen with flour dusting the wooden counter and fresh herbs",
  "Cozy reading nook by a large window with natural light streaming in, surrounded by books and a warm blanket",
  "Urban gardening on a rooftop terrace with tomatoes, herbs, and vegetables growing in raised beds",
  "Morning jog through a tree-lined residential street with birds singing and fresh air filling the lungs",
  "Watercolor painting session of a mountain landscape with brushes, palette, and easel set up outdoors",
  "Acoustic guitar performance on a front porch at sunset with neighbors gathered to listen",
  "Sourdough bread baking in a home kitchen with the warm aroma filling the entire house",
  "Meditation session at dawn on a beach with waves gently lapping the shore and seagulls calling",
  "Creative writing session in a bustling coffee shop with laptop, notebook, and steaming latte",
  "Morning skincare routine with natural products and gentle massage techniques in a well-lit bathroom",
  "Playful dog training session in a fenced backyard with treats, toys, and lots of tail wagging",
  "Vintage sewing machine project creating a patchwork quilt with colorful fabric scraps",
  "Morning stretch routine on a yoga mat with sunlight streaming through the window",
  "Home library organization with books arranged by color and genre on wooden shelves",
  "Fresh fruit smoothie preparation with a high-speed blender and colorful ingredients",
  "Evening relaxation with scented candles, soft music, and a good book",
  "Plant care routine watering houseplants with a watering can and checking soil moisture",
  "Traditional Japanese tea ceremony with matcha powder, bamboo whisk, and ceramic bowls",

  // Travel & Adventure (20) - More exciting and specific
  "Exploring ancient Mayan temple ruins in Guatemala with stone carvings and mysterious hieroglyphs",
  "Tropical beach in the Maldives with crystal clear turquoise water and pristine white sand",
  "Challenging mountain hiking trail with heavy backpack, trekking poles, and stunning alpine views",
  "Gothic cathedral in Paris with magnificent stained glass windows and soaring vaulted ceilings",
  "Desert oasis in Morocco with palm trees, natural springs, and traditional Berber tents",
  "Cable car ascending the Matterhorn with breathtaking views of the Swiss Alps",
  "Traditional Greek village with whitewashed stone houses and blue-domed churches",
  "Hot air balloon floating over Cappadocia's fairy chimneys at sunrise",
  "Medieval castle in Scotland perched on a hilltop overlooking misty valleys",
  "Amazon rainforest expedition with exotic birds, monkeys, and vibrant tropical plants",
  "Mediterranean coastline in Santorini with white buildings and blue-domed churches",
  "Mountain pass in the Himalayas with winding roads and prayer flags fluttering",
  "Traditional market in Marrakech with colorful spices, textiles, and exotic fruits",
  "Desert caravan in the Sahara with camels, tents, and endless sand dunes",
  "Island paradise in Bora Bora with overwater bungalows and coral reefs",
  "Historic bridge in Prague spanning the Vltava River with Gothic architecture",
  "Mountain cabin in the Rockies with wood smoke rising from a stone chimney",
  "Traditional fishing village in Cinque Terre with colorful houses on steep cliffs",
  "Desert sunset in Arizona with saguaro cacti silhouetted against orange sky",
  "Mountain lake in Banff with crystal clear waters reflecting snow-capped peaks",

  // Abstract & Creative (20) - More visually striking and specific
  "Explosive paint splatter art with vibrant colors flying across a large white canvas",
  "Mesmerizing geometric shapes rotating and morphing in a digital animation sequence",
  "Dramatic light patterns streaming through Venetian blinds creating striped shadows",
  "Abstract digital art creation using a graphics tablet with flowing brush strokes",
  "Macro photography of water droplets on a glass surface with perfect spherical reflections",
  "Intriguing shadow play on a textured brick wall with dramatic lighting angles",
  "Hypnotic kaleidoscope of rotating colors and patterns in a continuous loop",
  "Fractal patterns found in nature like fern leaves and snowflakes under magnification",
  "Prismatic light refraction creating rainbow spectrums across a white wall",
  "Contemporary abstract dance performance with flowing movements and dramatic lighting",
  "Smooth color gradient blending from deep blue to vibrant orange across a canvas",
  "Architectural details of modern buildings with clean lines and geometric forms",
  "Striking contrast between light and shadow in a black and white photography series",
  "Musical visualization with sound waves transforming into colorful abstract patterns",
  "Slow-motion liquid mixing with colorful dyes creating mesmerizing swirl patterns",
  "Dynamic geometric patterns in motion with triangles, circles, and squares",
  "Crystal light refraction creating brilliant rainbow effects in a dark room",
  "Abstract digital animation with morphing shapes and fluid transitions",
  "Colorful smoke patterns from dry ice creating ethereal and mysterious effects",
  "Geometric light installation with LED strips creating three-dimensional patterns"
];

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
  
  // Create videos with descriptions
  const videos = [];
  for (let i = 0; i < videoDescriptions.length; i++) {
    const description = videoDescriptions[i];
    const title = `Video ${i + 1}`;
    
    // Use picsum.photos for placeholder images with different seeds
    const thumbnail = `https://picsum.photos/400/600?random=${i + 1}`;
    
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
