import { prisma } from './prisma';
import { embeddingService } from './embeddings';

export class EmbeddingsSimilarityEngine {
  // Check if embeddings exist (without generating them)
  async hasEmbeddings(): Promise<boolean> {
    const videoWithEmbedding = await prisma.video.findFirst({
      where: { embedding: { not: null } }
    });
    return !!videoWithEmbedding;
  }

  // Find similar videos using embeddings
  async findSimilarByVideoId(videoId: string, limit: number = 10) {
    // Check if embeddings exist
    const hasEmbeddings = await this.hasEmbeddings();
    if (!hasEmbeddings) {
      throw new Error('No embeddings found. Please run the embedding generation script first.');
    }

    // Get target video embedding
    const targetVideo = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, embedding: true, title: true, description: true, thumbnail: true, url: true, createdAt: true, updatedAt: true }
    });

    if (!targetVideo || !targetVideo.embedding) {
      throw new Error('Video not found or has no embedding');
    }

    const targetEmbedding = JSON.parse(targetVideo.embedding);

    // Get all videos with embeddings
    const allVideos = await prisma.video.findMany({
      where: { 
        embedding: { not: null },
        id: { not: videoId }
      },
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

    // Calculate similarities
    const similarities = allVideos.map(video => {
      const embedding = JSON.parse(video.embedding!);
      const similarity = embeddingService.cosineSimilarity(targetEmbedding, embedding);
      
      return {
        ...video,
        similarity: Math.round(similarity * 100) / 100
      };
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Find similar videos using text query
  async findSimilarByQuery(query: string, limit: number = 10) {
    // Check if embeddings exist
    const hasEmbeddings = await this.hasEmbeddings();
    if (!hasEmbeddings) {
      throw new Error('No embeddings found. Please run the embedding generation script first.');
    }

    // Generate embedding for query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Get all videos with embeddings
    const allVideos = await prisma.video.findMany({
      where: { embedding: { not: null } },
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

    // Calculate similarities
    const similarities = allVideos.map(video => {
      const embedding = JSON.parse(video.embedding!);
      const similarity = embeddingService.cosineSimilarity(queryEmbedding, embedding);
      
      return {
        ...video,
        similarity: Math.round(similarity * 100) / 100
      };
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

}

export const embeddingsSimilarityEngine = new EmbeddingsSimilarityEngine();
