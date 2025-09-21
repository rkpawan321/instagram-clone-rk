import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Find and delete the like interaction
    const deletedInteraction = await prisma.interaction.deleteMany({
      where: {
        videoId: id,
        userId: userId,
        type: 'like',
      },
    });

    if (deletedInteraction.count === 0) {
      return NextResponse.json({ message: 'Video was not liked' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Video unliked successfully',
      count: deletedInteraction.count 
    });
  } catch (error) {
    console.error('Error unliking video:', error);
    return NextResponse.json(
      { error: 'Failed to unlike video' },
      { status: 500 }
    );
  }
}
