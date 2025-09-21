import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;
    const { userId = 'demo-user-1' } = await request.json();

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Toggle like (create if doesn't exist, delete if exists)
    const existingLike = await prisma.interaction.findUnique({
      where: {
        userId_videoId_type: {
          userId,
          videoId,
          type: 'LIKE'
        }
      }
    });

    if (existingLike) {
      // Unlike - delete the interaction
      await prisma.interaction.delete({
        where: { id: existingLike.id }
      });

      return NextResponse.json({
        liked: false,
        message: 'Video unliked'
      });
    } else {
      // Like - create the interaction
      await prisma.interaction.create({
        data: {
          userId,
          videoId,
          type: 'LIKE'
        }
      });

      return NextResponse.json({
        liked: true,
        message: 'Video liked'
      });
    }

  } catch (error) {
    console.error('Error in like/unlike:', error);
    return NextResponse.json(
      { error: 'Failed to like/unlike video' },
      { status: 500 }
    );
  }
}
