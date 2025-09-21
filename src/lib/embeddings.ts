import OpenAI from 'openai';

// Initialize OpenAI client (will work if OPENAI_API_KEY is set)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export class EmbeddingService {
  private static instance: EmbeddingService;
  private embeddings: Map<string, number[]> = new Map();

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  // Generate embedding for text using OpenAI
  async generateEmbedding(text: string): Promise<number[]> {
    if (!openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  // Compute cosine similarity between two embeddings
  cosineSimilarity(embeddingA: number[], embeddingB: number[]): number {
    if (embeddingA.length !== embeddingB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < embeddingA.length; i++) {
      dotProduct += embeddingA[i] * embeddingB[i];
      normA += embeddingA[i] * embeddingA[i];
      normB += embeddingB[i] * embeddingB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Find similar videos using embeddings
  findSimilarByEmbedding(
    targetEmbedding: number[],
    videoEmbeddings: Array<{ id: string; embedding: number[]; video: any }>,
    limit: number = 10
  ): Array<{ video: any; similarity: number }> {
    const similarities = videoEmbeddings.map(({ id, embedding, video }) => ({
      video,
      similarity: this.cosineSimilarity(targetEmbedding, embedding)
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Check if OpenAI is available
  isAvailable(): boolean {
    return openai !== null;
  }
}

export const embeddingService = EmbeddingService.getInstance();
