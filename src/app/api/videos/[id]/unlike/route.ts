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

    // Find and delete the like interaction
    const existingLike = await prisma.interaction.findUnique({
      where: {
        userId_videoId_type: {
          userId,
          videoId,
          type: 'LIKE'
        }
      }
    });

    if (!existingLike) {
      return NextResponse.json({ 
        message: 'Video was not liked' 
      }, { status: 400 });
    }

    // Delete the like interaction
    await prisma.interaction.delete({
      where: { id: existingLike.id }
    });

    return NextResponse.json({ 
      message: 'Video unliked successfully'
    });
  } catch (error) {
    console.error('Error unliking video:', error);
    return NextResponse.json(
      { error: 'Failed to unlike video' },
      { status: 500 }
    );
  }
}
