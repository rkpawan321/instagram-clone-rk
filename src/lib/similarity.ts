// Simple TF-IDF and cosine similarity implementation
export class SimilarityEngine {
  private documents: Array<{ id: string; text: string; video: any }>;
  private termFrequencies: Map<string, Map<string, number>>;
  private documentFrequencies: Map<string, number>;
  private allTerms: Set<string>;

  constructor() {
    this.documents = [];
    this.termFrequencies = new Map();
    this.documentFrequencies = new Map();
    this.allTerms = new Set();
  }

  // Add documents to the corpus
  addDocuments(videos: Array<{ id: string; title: string; description: string }>) {
    this.documents = videos.map(video => ({
      id: video.id,
      text: `${video.title} ${video.description}`.toLowerCase(),
      video
    }));

    // Compute term frequencies
    this.computeTermFrequencies();
  }

  // Compute term frequencies for all documents
  private computeTermFrequencies() {
    this.termFrequencies.clear();
    this.documentFrequencies.clear();
    this.allTerms.clear();

    // Count term frequencies in each document
    this.documents.forEach(doc => {
      const terms = this.tokenize(doc.text);
      const termCounts = new Map<string, number>();
      
      terms.forEach(term => {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
        this.allTerms.add(term);
      });
      
      this.termFrequencies.set(doc.id, termCounts);
    });

    // Compute document frequencies
    this.allTerms.forEach(term => {
      let docCount = 0;
      this.termFrequencies.forEach(termCounts => {
        if (termCounts.has(term)) {
          docCount++;
        }
      });
      this.documentFrequencies.set(term, docCount);
    });
  }

  // Simple tokenization
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2);
  }

  // Compute TF-IDF score for a term in a document
  private getTfIdf(term: string, docId: string): number {
    const termCounts = this.termFrequencies.get(docId);
    if (!termCounts || !termCounts.has(term)) return 0;

    const tf = termCounts.get(term)!;
    const df = this.documentFrequencies.get(term) || 1;
    const idf = Math.log(this.documents.length / df);
    
    return tf * idf;
  }

  // Compute document vector
  private getDocumentVector(docId: string): number[] {
    const vector: number[] = [];
    const terms = Array.from(this.allTerms);
    
    terms.forEach(term => {
      vector.push(this.getTfIdf(term, docId));
    });
    
    return vector;
  }

  // Compute cosine similarity between two vectors
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Find similar videos based on a video ID
  findSimilarByVideoId(videoId: string, limit: number = 10): Array<{ video: any; similarity: number }> {
    const targetVector = this.getDocumentVector(videoId);
    const similarities: Array<{ video: any; similarity: number }> = [];

    this.documents.forEach(doc => {
      if (doc.id !== videoId) {
        const docVector = this.getDocumentVector(doc.id);
        const similarity = this.cosineSimilarity(targetVector, docVector);
        similarities.push({
          video: doc.video,
          similarity
        });
      }
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Find similar videos based on a text query
  findSimilarByQuery(query: string, limit: number = 10): Array<{ video: any; similarity: number }> {
    const queryTerms = this.tokenize(query);
    const queryVector = this.computeQueryVector(queryTerms);
    const similarities: Array<{ video: any; similarity: number }> = [];

    this.documents.forEach(doc => {
      const docVector = this.getDocumentVector(doc.id);
      const similarity = this.cosineSimilarity(queryVector, docVector);
      similarities.push({
        video: doc.video,
        similarity
      });
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Compute query vector
  private computeQueryVector(queryTerms: string[]): number[] {
    const vector: number[] = [];
    const terms = Array.from(this.allTerms);
    
    terms.forEach(term => {
      const termCount = queryTerms.filter(t => t === term).length;
      const tf = termCount / queryTerms.length;
      const df = this.documentFrequencies.get(term) || 1;
      const idf = Math.log(this.documents.length / df);
      vector.push(tf * idf);
    });
    
    return vector;
  }

  // Get all terms in the corpus
  getTerms(): string[] {
    return Array.from(this.allTerms);
  }

  // Get document count
  getDocumentCount(): number {
    return this.documents.length;
  }
}

// Singleton instance
let similarityEngine: SimilarityEngine | null = null;

export function getSimilarityEngine(): SimilarityEngine {
  if (!similarityEngine) {
    similarityEngine = new SimilarityEngine();
  }
  return similarityEngine;
}

// Utility function to preprocess text
export function preprocessText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
