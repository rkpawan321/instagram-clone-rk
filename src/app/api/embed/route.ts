import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { embeddingService } from '@/lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const { videoId, text } = await request.json();

    if (!embeddingService.isAvailable()) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.' },
        { status: 400 }
      );
    }

    let embedding: number[];
    let targetVideoId: string;

    if (videoId) {
      // Generate embedding for a specific video
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true, title: true, description: true }
      });

      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }

      const textToEmbed = `${video.title} ${video.description}`;
      embedding = await embeddingService.generateEmbedding(textToEmbed);
      targetVideoId = videoId;

      // Store embedding in database
      await prisma.video.update({
        where: { id: videoId },
        data: {
          embedding: JSON.stringify(embedding)
        }
      });

    } else if (text) {
      // Generate embedding for custom text
      embedding = await embeddingService.generateEmbedding(text);
      targetVideoId = 'query';
    } else {
      return NextResponse.json(
        { error: 'Either videoId or text is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      embedding,
      videoId: targetVideoId,
      dimension: embedding.length
    });

  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId parameter is required' },
        { status: 400 }
      );
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, embedding: true, title: true, description: true }
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    const embedding = video.embedding ? JSON.parse(video.embedding) : null;

    return NextResponse.json({
      videoId: video.id,
      title: video.title,
      description: video.description,
      hasEmbedding: !!embedding,
      embedding: embedding,
      dimension: embedding ? embedding.length : 0
    });

  } catch (error) {
    console.error('Error fetching embedding:', error);
    return NextResponse.json(
      { error: 'Failed to fetch embedding' },
      { status: 500 }
    );
  }
}
