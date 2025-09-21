import { prisma } from './prisma';
import { getSimilarityEngine } from './similarity';
import { embeddingService } from './embeddings';

export class HybridSimilarityEngine {
  // Find similar videos using the best available method
  async findSimilar(videoId?: string, query?: string, limit: number = 10) {
    // Check if we have embeddings available
    const hasEmbeddings = await this.checkEmbeddingsAvailable();
    
    if (hasEmbeddings && embeddingService.isAvailable()) {
      return this.findSimilarWithEmbeddings(videoId, query, limit);
    } else {
      return this.findSimilarWithTFIDF(videoId, query, limit);
    }
  }

  // Check if any videos have embeddings
  private async checkEmbeddingsAvailable(): Promise<boolean> {
    const videoWithEmbedding = await prisma.video.findFirst({
      where: {
        embedding: {
          not: null
        }
      }
    });
    return !!videoWithEmbedding;
  }

  // Find similar videos using embeddings
  private async findSimilarWithEmbeddings(videoId?: string, query?: string, limit: number = 10) {
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        url: true,
        createdAt: true,
        updatedAt: true,
        embedding: true
      }
    });

    const videosWithEmbeddings = videos
      .filter(v => v.embedding)
      .map(v => ({
        ...v,
        embedding: JSON.parse(v.embedding!)
      }));

    if (videosWithEmbeddings.length === 0) {
      // Fallback to TF-IDF if no embeddings
      return this.findSimilarWithTFIDF(videoId, query, limit);
    }

    let targetEmbedding: number[];

    if (videoId) {
      const targetVideo = videosWithEmbeddings.find(v => v.id === videoId);
      if (!targetVideo) {
        throw new Error('Video not found or has no embedding');
      }
      targetEmbedding = targetVideo.embedding;
    } else if (query) {
      targetEmbedding = await embeddingService.generateEmbedding(query);
    } else {
      throw new Error('Either videoId or query is required');
    }

    const results = embeddingService.findSimilarByEmbedding(
      targetEmbedding,
      videosWithEmbeddings,
      limit
    );

    return results.map(result => ({
      ...result.video,
      similarity: Math.round(result.similarity * 100) / 100
    }));
  }

  // Find similar videos using TF-IDF
  private async findSimilarWithTFIDF(videoId?: string, query?: string, limit: number = 10) {
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        url: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const similarityEngine = getSimilarityEngine();
    similarityEngine.addDocuments(videos);

    let results: Array<{ video: any; similarity: number }>;

    if (videoId) {
      results = similarityEngine.findSimilarByVideoId(videoId, limit);
    } else if (query) {
      results = similarityEngine.findSimilarByQuery(query, limit);
    } else {
      throw new Error('Either videoId or query is required');
    }

    return results.map(result => ({
      ...result.video,
      similarity: Math.round(result.similarity * 100) / 100
    }));
  }

  // Get similarity method being used
  async getMethod(): Promise<'embeddings' | 'tfidf'> {
    const hasEmbeddings = await this.checkEmbeddingsAvailable();
    return (hasEmbeddings && embeddingService.isAvailable()) ? 'embeddings' : 'tfidf';
  }
}

export const hybridSimilarityEngine = new HybridSimilarityEngine();
