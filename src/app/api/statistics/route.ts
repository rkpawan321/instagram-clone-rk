import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    // Get total likes
    const totalLikes = await prisma.interaction.count({
      where: {
        userId: userId,
        type: 'LIKE',
      },
    });

    // Get total "more like this" interactions
    const totalMoreLikeThis = await prisma.interaction.count({
      where: {
        userId: userId,
        type: 'MORE_LIKE_THIS',
      },
    });

    // Get total custom inputs
    const totalCustomInputs = await prisma.customInput.count({
      where: {
        userId: userId,
      },
    });

    // Get liked videos with their descriptions for category analysis
    const likedVideos = await prisma.interaction.findMany({
      where: {
        userId: userId,
        type: 'LIKE',
      },
      include: {
        video: {
          select: {
            title: true,
            description: true,
          },
        },
      },
    });

    // Simple category extraction based on keywords in descriptions
    const categoryCounts: { [key: string]: number } = {};
    likedVideos.forEach((interaction) => {
      const description = interaction.video.description.toLowerCase();
      
      // Define category keywords
      const categories = {
        'Nature': ['nature', 'landscape', 'forest', 'mountain', 'beach', 'ocean', 'tree', 'flower', 'animal', 'wildlife'],
        'Urban': ['city', 'street', 'building', 'urban', 'downtown', 'traffic', 'car', 'bus', 'road'],
        'People': ['person', 'people', 'man', 'woman', 'child', 'family', 'group', 'crowd', 'face'],
        'Food': ['food', 'restaurant', 'meal', 'cooking', 'kitchen', 'dining', 'eat', 'drink'],
        'Sports': ['sport', 'game', 'ball', 'running', 'swimming', 'basketball', 'football', 'tennis'],
        'Travel': ['travel', 'vacation', 'hotel', 'airport', 'plane', 'train', 'trip', 'journey'],
        'Technology': ['computer', 'phone', 'screen', 'digital', 'tech', 'electronic', 'device'],
        'Art': ['art', 'painting', 'drawing', 'sculpture', 'gallery', 'museum', 'creative', 'design'],
      };

      // Check each category
      Object.entries(categories).forEach(([category, keywords]) => {
        if (keywords.some(keyword => description.includes(keyword))) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      });
    });

    // Convert to array and sort by count
    const mostLikedCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent activity (last 10 interactions)
    const recentActivity = await prisma.interaction.findMany({
      where: {
        userId: userId,
      },
      include: {
        video: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Format recent activity
    const formattedRecentActivity = recentActivity.map((activity) => ({
      id: activity.id,
      type: activity.type,
      videoTitle: activity.video.title,
      timestamp: new Date(activity.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    return NextResponse.json({
      totalLikes,
      totalMoreLikeThis,
      totalCustomInputs,
      mostLikedCategories,
      recentActivity: formattedRecentActivity,
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
