import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get "More Like This" interactions with video details
    const moreLikeThisInteractions = await prisma.interaction.findMany({
      where: {
        userId: userId,
        type: 'MORE_LIKE_THIS',
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the response
    const videos = moreLikeThisInteractions.map((interaction) => ({
      id: interaction.video.id,
      title: interaction.video.title,
      description: interaction.video.description,
      thumbnail: interaction.video.thumbnail,
      timestamp: interaction.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    return NextResponse.json({ videos });

  } catch (error) {
    console.error('Error fetching more like this videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch more like this videos' },
      { status: 500 }
    );
  }
}
