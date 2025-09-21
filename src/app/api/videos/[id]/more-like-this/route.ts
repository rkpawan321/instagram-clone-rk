import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSimilarityEngine, preprocessText } from '@/lib/similarity';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;
    const body = await request.json();
    const { editedDescription, userId = 'demo-user-1', offset = 0, limit = 20 } = body;

    // Get the target video
    const targetVideo = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        url: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!targetVideo) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Get all videos for similarity engine
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        url: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Initialize similarity engine
    const similarityEngine = getSimilarityEngine();
    similarityEngine.addDocuments(videos);

    // Use edited description if provided, otherwise use original
    const searchQuery = editedDescription || targetVideo.description;
    const processedQuery = preprocessText(searchQuery);

    // Find similar videos (get more than needed for pagination)
    const results = similarityEngine.findSimilarByQuery(processedQuery, 100);

    // Record the interaction
    await prisma.interaction.upsert({
      where: {
        userId_videoId_type: {
          userId,
          videoId,
          type: 'MORE_LIKE_THIS'
        }
      },
      update: {
        note: editedDescription || null,
      },
      create: {
        userId,
        videoId,
        type: 'MORE_LIKE_THIS',
        note: editedDescription || null,
      }
    });

    // Format results
    const allSimilarVideos = results.map(result => ({
      ...result.video,
      similarity: Math.round(result.similarity * 100) / 100,
    }));

    // Apply pagination
    const paginatedVideos = allSimilarVideos.slice(offset, offset + limit);
    const total = allSimilarVideos.length;

    return NextResponse.json({
      videos: paginatedVideos,
      originalVideo: targetVideo,
      searchQuery: processedQuery,
      total: total,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('Error in more-like-this:', error);
    return NextResponse.json(
      { error: 'Failed to find similar videos' },
      { status: 500 }
    );
  }
}
