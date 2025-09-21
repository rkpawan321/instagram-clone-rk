import { NextRequest, NextResponse } from 'next/server';
import { embeddingsSimilarityEngine } from '@/lib/embeddings-similarity';
import { getSimilarityEngine, preprocessText } from '@/lib/similarity';
import { embeddingService } from '@/lib/embeddings';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!videoId && !query) {
      return NextResponse.json(
        { error: 'Either id or q parameter is required' },
        { status: 400 }
      );
    }

    let similarVideos: any[];
    let method: string;

    // Try embeddings first (primary approach)
    if (embeddingService.isAvailable()) {
      try {
        if (videoId) {
          similarVideos = await embeddingsSimilarityEngine.findSimilarByVideoId(videoId, limit + offset);
        } else {
          similarVideos = await embeddingsSimilarityEngine.findSimilarByQuery(query!, limit + offset);
        }
        method = 'embeddings';
      } catch (error) {
        console.log('Embeddings failed, falling back to TF-IDF:', error);
        // Fallback to TF-IDF
        similarVideos = await fallbackToTFIDF(videoId, query, limit + offset);
        method = 'tfidf-fallback';
      }
    } else {
      // No OpenAI API key, use TF-IDF
      similarVideos = await fallbackToTFIDF(videoId, query, limit + offset);
      method = 'tfidf';
    }

    // Apply pagination
    const paginatedVideos = similarVideos.slice(offset, offset + limit);
    const total = similarVideos.length;

    return NextResponse.json({
      videos: paginatedVideos,
      query: query || null,
      videoId: videoId || null,
      total: total,
      method: method,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('Error in similarity search:', error);
    return NextResponse.json(
      { error: 'Failed to perform similarity search' },
      { status: 500 }
    );
  }
}

// Fallback to TF-IDF when embeddings are not available
async function fallbackToTFIDF(videoId: string | null, query: string | null, limit: number) {
  const { prisma } = await import('@/lib/prisma');
  
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

  const similarityEngine = getSimilarityEngine();
  similarityEngine.addDocuments(videos);

  let results: Array<{ video: any; similarity: number }> = [];

  if (videoId) {
    results = similarityEngine.findSimilarByVideoId(videoId, limit);
  } else if (query) {
    const processedQuery = preprocessText(query);
    results = similarityEngine.findSimilarByQuery(processedQuery, limit);
  }

  return results.map(result => ({
    ...result.video,
    similarity: Math.round(result.similarity * 100) / 100,
  }));
}
