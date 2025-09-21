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


    // Get recent activity (last 10 interactions and custom inputs)
    const recentInteractions = await prisma.interaction.findMany({
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

    const recentCustomInputs = await prisma.customInput.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Format interactions
    const formattedInteractions = recentInteractions.map((activity) => {
      let type = activity.type.toLowerCase();
      if (type === 'like') {
        type = 'like';
      } else if (type === 'more_like_this') {
        type = 'more-like-this';
      }
      
      return {
        id: activity.id,
        type: type,
        videoTitle: activity.video?.title || 'Unknown Video',
        timestamp: new Date(activity.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    });

    // Format custom inputs
    const formattedCustomInputs = recentCustomInputs.map((input) => ({
      id: input.id,
      type: 'custom-input',
      videoTitle: input.text,
      timestamp: new Date(input.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    // Combine and sort by timestamp
    const formattedRecentActivity = [...formattedInteractions, ...formattedCustomInputs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    console.log('🔍 Recent Activity Debug:', {
      interactions: formattedInteractions.length,
      customInputs: formattedCustomInputs.length,
      combined: formattedRecentActivity.length,
      sample: formattedRecentActivity[0],
      allTypes: formattedRecentActivity.map(a => ({ type: a.type, title: a.videoTitle }))
    });

    return NextResponse.json({
      totalLikes,
      totalMoreLikeThis,
      totalCustomInputs,
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
