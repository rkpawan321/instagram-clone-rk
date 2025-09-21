import { prisma } from './prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PromptData {
  structured: {
    subject: string;
    actions: string[];
    style: string;
    setting: string;
    mood: string;
    duration: string;
    lighting: string;
    colors: string[];
  };
  prompt: string;
  prompts: string[]; // Array of individual prompts from each cluster
  sources: {
    likedVideos: number;
    moreLikeThis: number;
    customInputs: number;
  };
}

export class PromptGenerator {
  // Generate AI prompt from user interactions
  async generatePrompt(userId: string = 'demo-user-1'): Promise<PromptData> {
    // Get user's liked videos
    const likedVideos = await prisma.interaction.findMany({
      where: {
        userId,
        type: 'LIKE'
      },
      include: {
        video: {
          select: {
            title: true,
            description: true
          }
        }
      }
    });

    // Get user's "more like this" interactions
    const moreLikeThis = await prisma.interaction.findMany({
      where: {
        userId,
        type: 'MORE_LIKE_THIS'
      },
      select: {
        id: true,
        userId: true,
        videoId: true,
        type: true,
        note: true,
        video: {
          select: {
            title: true,
            description: true
          }
        }
      }
    });

    // Get custom inputs
    const customInputs = await prisma.customInput.findMany({
      where: { userId }
    });

    // Extract keywords and themes from ALL user interactions
    const allDescriptions = [
      ...likedVideos.map(i => i.video.description),
      ...moreLikeThis.map(i => i.note || i.video.description), // Use edited description if available, fallback to original
      ...customInputs.map(i => i.text)
    ];

    console.log('📊 User Interaction Summary:');
    console.log('  - Liked Videos:', likedVideos.length);
    console.log('  - More Like This:', moreLikeThis.length);
    console.log('  - Custom Inputs:', customInputs.length);
    console.log('  - Total Descriptions:', allDescriptions.length);

    // Analyze content to extract structured data from ALL interactions
    const analysis = this.analyzeContent(allDescriptions);

    // Generate structured prompt
    const structured = this.generateStructuredPrompt(analysis);

    // Generate natural language prompts using OpenAI with clustering
    const { combinedPrompt, individualPrompts } = await this.generateNaturalPrompt(structured, analysis);

    return {
      structured,
      prompt: combinedPrompt,
      prompts: individualPrompts,
      sources: {
        likedVideos: likedVideos.length,
        moreLikeThis: moreLikeThis.length,
        customInputs: customInputs.length
      }
    };
  }

  // Analyze content to extract themes and keywords
  private analyzeContent(descriptions: string[]): {
    themes: string[];
    actions: string[];
    settings: string[];
    moods: string[];
    colors: string[];
    lighting: string[];
    totalItems: number;
    rawDescriptions: string[];
  } {
    console.log('🔍 Analyzing content - Total descriptions:', descriptions.length);
    console.log('📋 All descriptions:', descriptions);
    
    const allText = descriptions.join(' ').toLowerCase();
    console.log('📝 Combined text length:', allText.length);
    console.log('📝 Combined text preview:', allText.substring(0, 200) + '...');
    
    // Extract common themes
    const themes = this.extractThemes(allText);
    const actions = this.extractActions(allText);
    const settings = this.extractSettings(allText);
    const moods = this.extractMoods(allText);
    const colors = this.extractColors(allText);
    const lighting = this.extractLighting(allText);

    console.log('🎯 Analysis results:', {
      themes,
      actions,
      settings,
      moods,
      colors,
      lighting,
      totalItems: descriptions.length,
      allTextLength: allText.length
    });

    return {
      themes,
      actions,
      settings,
      moods,
      colors,
      lighting,
      totalItems: descriptions.length,
      rawDescriptions: descriptions // Keep original descriptions for better analysis
    };
  }

  // Extract common themes from text - now data-driven
  private extractThemes(text: string): string[] {
    // Extract meaningful themes from the text content
    const meaningfulWords = text.split(/\s+/).filter(word => 
      word.length > 4 && 
      !word.includes('ing') && 
      !word.includes('ed') &&
      !['the', 'and', 'with', 'from', 'that', 'this', 'they', 'have', 'been', 'were', 'will', 'would', 'could', 'should'].includes(word.toLowerCase())
    );
    
    // Count word frequency to find most common themes
    const wordCount: { [key: string]: number } = {};
    meaningfulWords.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord.length > 3) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });
    
    // Sort by frequency and return top themes
    const sortedThemes = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
    
    return sortedThemes.length > 0 ? sortedThemes : ['diverse content'];
  }

  // Extract action words - now data-driven with content filtering
  private extractActions(text: string): string[] {
    const words = text.split(/\s+/);

    // Define appropriate action words for video content
    const appropriateActions = [
      'walking', 'running', 'jumping', 'dancing', 'playing', 'performing', 'creating', 'making', 'building', 'designing',
      'cooking', 'painting', 'drawing', 'singing', 'learning', 'teaching', 'exercising', 'swimming', 'cycling', 'hiking',
      'exploring', 'traveling', 'gardening', 'reading', 'writing', 'photographing', 'filming', 'skateboarding', 'surfing'
    ];

    const actionWords = words.filter(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      return (
        (word.endsWith('ing') && cleanWord.length > 4) ||
        appropriateActions.includes(cleanWord) ||
        ['walk', 'run', 'jump', 'sit', 'stand', 'play', 'perform', 'show', 'create', 'make', 'build', 'design', 'cook', 'paint', 'draw', 'sing', 'learn', 'teach', 'exercise', 'swim', 'cycle', 'hike'].includes(cleanWord)
      );
    });

    // Filter out inappropriate content
    const inappropriateWords = ['naked', 'nude', 'sexual', 'explicit', 'adult', 'inappropriate'];
    const filteredActions = actionWords.filter(word =>
      !inappropriateWords.some(inappropriate => word.toLowerCase().includes(inappropriate))
    );

    // Count frequency and return most common appropriate actions
    const actionCount: { [key: string]: number } = {};
    filteredActions.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord.length > 3) {
        actionCount[cleanWord] = (actionCount[cleanWord] || 0) + 1;
      }
    });

    const sortedActions = Object.entries(actionCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([word]) => this.capitalizeWord(word));

    return sortedActions.length > 0 ? sortedActions : ['Creative Activities', 'Movement', 'Performance'];
  }

  // Helper method to capitalize words properly
  private capitalizeWord(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  // Extract setting descriptions - now data-driven
  private extractSettings(text: string): string[] {
    const words = text.split(/\s+/);
    const settingWords = words.filter(word => 
      word.length > 3 && 
      ['place', 'area', 'room', 'space', 'location', 'spot'].some(place => word.includes(place)) ||
      ['beach', 'mountain', 'forest', 'city', 'street', 'park', 'garden', 'kitchen', 'house', 'stage', 'arena', 'sidewalk', 'gym', 'studio'].includes(word.toLowerCase())
    );
    
    // Count frequency and return most common settings
    const settingCount: { [key: string]: number } = {};
    settingWords.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord.length > 2) {
        settingCount[cleanWord] = (settingCount[cleanWord] || 0) + 1;
      }
    });
    
    const sortedSettings = Object.entries(settingCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([word]) => word);
    
    return sortedSettings.length > 0 ? sortedSettings : ['dynamic environments'];
  }

  // Extract mood descriptors - now data-driven
  private extractMoods(text: string): string[] {
    const words = text.split(/\s+/);
    const moodWords = words.filter(word => 
      ['happy', 'sad', 'excited', 'calm', 'peaceful', 'energetic', 'relaxed', 'tense', 'joyful', 'serene'].includes(word) ||
      word.endsWith('ful') ||
      word.endsWith('ing') && word.length > 6
    );
    
    return [...new Set(moodWords)].slice(0, 3);
  }

  // Extract color references - now data-driven
  private extractColors(text: string): string[] {
    const words = text.split(/\s+/);
    const colorWords = words.filter(word => 
      ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'brown', 'black', 'white', 'gray', 'grey'].includes(word) ||
      word.endsWith('ish') ||
      word.includes('color')
    );
    
    return [...new Set(colorWords)].slice(0, 3);
  }

  // Extract lighting descriptions - now data-driven
  private extractLighting(text: string): string[] {
    const words = text.split(/\s+/);
    const lightingWords = words.filter(word => 
      ['light', 'dark', 'bright', 'dim', 'sunny', 'shadow', 'glow', 'shine'].includes(word) ||
      word.includes('light') ||
      word.includes('bright')
    );
    
    return [...new Set(lightingWords)].slice(0, 3);
  }

  // Generate structured prompt data - now completely data-driven
  private generateStructuredPrompt(analysis: {
    themes: string[];
    actions: string[];
    settings: string[];
    moods: string[];
    colors: string[];
    lighting: string[];
    totalItems: number;
  }) {
    // Use actual data from user content with better fallbacks
    return {
      subject: analysis.themes[0] || 'diverse content',
      actions: analysis.actions.slice(0, 3) || ['engaging activities'],
      style: this.determineStyleFromContent(analysis),
      setting: analysis.settings[0] || 'dynamic environments',
      mood: analysis.moods[0] || 'engaging and professional',
      duration: this.determineDurationFromContent(analysis),
      lighting: analysis.lighting[0] || 'high quality, well-lit',
      colors: analysis.colors.slice(0, 3) || ['vibrant', 'cohesive']
    };
  }

  // Determine video style based on actual content analysis
  private determineStyleFromContent(analysis: {
    themes: string[];
    totalItems: number;
  }): string {
    // Provide professional video styles based on content
    const styles = ['cinematic', 'documentary', 'lifestyle', 'educational', 'artistic', 'dynamic'];
    
    // Use a simple hash of themes to pick a consistent style
    if (analysis.themes.length > 0) {
      const themeHash = analysis.themes.join('').length;
      return styles[themeHash % styles.length];
    }
    return 'cinematic';
  }

  // Determine duration based on actual user interaction patterns
  private determineDurationFromContent(analysis: {
    totalItems: number;
  }): string {
    // Base duration on actual user behavior
    if (analysis.totalItems > 10) return 'long-form (2-5 minutes)';
    if (analysis.totalItems > 5) return 'medium (30-60 seconds)';
    if (analysis.totalItems > 0) return 'short (15-30 seconds)';
    return 'duration based on your preferences';
  }

  // Generate sophisticated, dynamic natural language prompt using OpenAI with clustering
  private async generateNaturalPrompt(structured: {
    subject: string;
    actions: string[];
    style: string;
    setting: string;
    mood: string;
    duration: string;
    lighting: string;
    colors: string[];
  }, analysis: {
    themes: string[];
    actions: string[];
    settings: string[];
    moods: string[];
    colors: string[];
    lighting: string[];
    totalItems: number;
    rawDescriptions: string[];
  }): Promise<{
    combinedPrompt: string;
    individualPrompts: string[];
  }> {
    const { rawDescriptions } = analysis;
    
    if (rawDescriptions.length === 0) {
      return {
        combinedPrompt: "Create a video based on your preferences. Start by liking some videos or searching for content you enjoy.",
        individualPrompts: ["Create a video based on your preferences. Start by liking some videos or searching for content you enjoy."]
      };
    }

    console.log('🤖 Generating AI prompt with OpenAI API and clustering...');
    
    try {
      // Sanitize descriptions to remove sensitive content
      const sanitizedDescriptions = this.sanitizeKeywords(rawDescriptions);
      
      // Cluster descriptions by semantic similarity
      const clusters = await this.clusterDescriptions(sanitizedDescriptions);
      console.log('📊 Generated clusters:', clusters.length, 'clusters');
      
      // Generate prompts for each cluster
      const individualPrompts = await this.generatePromptsForClusters(clusters, structured);
      
      // Combine prompts for the main prompt
      const combinedPrompt = this.combinePrompts(individualPrompts, structured);
      
      console.log('✨ Generated AI prompts:', individualPrompts.length, 'individual prompts');
      console.log('✨ Combined prompt:', combinedPrompt);
      
      return {
        combinedPrompt,
        individualPrompts
      };
    } catch (error) {
      console.error('❌ Error generating AI prompt:', error);
      // Fallback to a simple prompt if OpenAI fails
      const keyElements = this.extractKeyElementsFromContent(rawDescriptions);
      const fallbackPrompt = this.generateFallbackPrompt(keyElements, structured);
      return {
        combinedPrompt: fallbackPrompt,
        individualPrompts: [fallbackPrompt]
      };
    }
  }

  // Build comprehensive context for OpenAI prompt generation
  private buildOpenAIContext(userProfile: {
    complexityLevel: string;
    diversityLevel: string;
    engagementLevel: string;
    totalInteractions: number;
    avgDescriptionLength: number;
    themes: {
      visual: string[];
      emotional: string[];
      narrative: string[];
      technical: string[];
      cultural: string[];
    };
  }, keyElements: {
    subjects: string[];
    locations: string[];
    activities: string[];
    specificDetails: string[];
    mood: string;
  }, structured: {
    subject: string;
    actions: string[];
    style: string;
    setting: string;
    mood: string;
    duration: string;
    lighting: string;
    colors: string[];
  }, rawDescriptions: string[]) {
    return {
      userProfile: {
        complexityLevel: userProfile.complexityLevel,
        diversityLevel: userProfile.diversityLevel,
        engagementLevel: userProfile.engagementLevel,
        totalInteractions: userProfile.totalInteractions,
        avgDescriptionLength: userProfile.avgDescriptionLength,
        themes: userProfile.themes
      },
      contentElements: {
        subjects: keyElements.subjects,
        locations: keyElements.locations,
        activities: keyElements.activities,
        specificDetails: keyElements.specificDetails,
        mood: keyElements.mood
      },
      videoSpecs: {
        duration: structured.duration,
        style: structured.style,
        setting: structured.setting,
        lighting: structured.lighting,
        colors: structured.colors
      },
      sourceContent: {
        descriptions: rawDescriptions,
        totalCount: rawDescriptions.length,
        sampleDescriptions: rawDescriptions.slice(0, 5) // First 5 for context
      }
    };
  }

  // Generate prompt using OpenAI API
  private async generatePromptWithOpenAI(context: {
    userProfile: {
      complexityLevel: string;
      diversityLevel: string;
      engagementLevel: string;
      totalInteractions: number;
      avgDescriptionLength: number;
      themes: {
        visual: string[];
        emotional: string[];
        narrative: string[];
        technical: string[];
        cultural: string[];
      };
    };
    contentElements: {
      subjects: string[];
      locations: string[];
      activities: string[];
      specificDetails: string[];
      mood: string;
    };
    videoSpecs: {
      duration: string;
      style: string;
      setting: string;
      lighting: string;
      colors: string[];
    };
    sourceContent: {
      descriptions: string[];
      totalCount: number;
      sampleDescriptions: string[];
    };
  }): Promise<string> {
    const systemPrompt = `You are an expert AI prompt generator for video creation. Your task is to create sophisticated, dynamic, and personalized video generation prompts based on user interaction data.

You will receive:
- User profile data (engagement level, complexity preferences, themes)
- Content elements extracted from user's liked videos and interactions
- Video specifications (duration, style, etc.)
- Sample content descriptions

Generate a compelling, creative video prompt that:
1. Uses the actual content elements from the user's interactions
2. Matches the user's engagement and complexity level
3. Incorporates the detected themes and preferences
4. Is unique and creative every time
5. Uses sophisticated, professional language
6. Is specific and actionable for video creation

The prompt should be 2-3 sentences long, engaging, and tailored to the user's actual content preferences.`;

    const userPrompt = `Based on this user data, generate a sophisticated video creation prompt:

USER PROFILE:
- Engagement Level: ${context.userProfile.engagementLevel}
- Complexity Level: ${context.userProfile.complexityLevel}
- Total Interactions: ${context.userProfile.totalInteractions}
- Detected Themes: ${JSON.stringify(context.userProfile.themes, null, 2)}

CONTENT ELEMENTS:
- Subjects: ${context.contentElements.subjects.join(', ')}
- Locations: ${context.contentElements.locations.join(', ')}
- Activities: ${context.contentElements.activities.join(', ')}
- Specific Details: ${context.contentElements.specificDetails.join(', ')}
- Mood: ${context.contentElements.mood}

VIDEO SPECS:
- Duration: ${context.videoSpecs.duration}
- Style: ${context.videoSpecs.style}
- Setting: ${context.videoSpecs.setting}
- Lighting: ${context.videoSpecs.lighting}
- Colors: ${context.videoSpecs.colors.join(', ')}

SAMPLE CONTENT (what user has liked):
${context.sourceContent.sampleDescriptions.map((desc: string, i: number) => `${i + 1}. ${desc}`).join('\n')}

Generate a unique, sophisticated video creation prompt that incorporates these elements creatively.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 300,
      temperature: 0.8, // Higher temperature for more creativity
      presence_penalty: 0.6, // Encourage diverse vocabulary
      frequency_penalty: 0.3 // Reduce repetition
    });

    return response.choices[0].message.content?.trim() || this.generateFallbackPrompt(context.contentElements, context.videoSpecs);
  }

  // Sanitize keywords to remove sensitive or inappropriate content
  private sanitizeKeywords(descriptions: string[]): string[] {
    const sensitiveKeywords = [
      'nude', 'naked', 'sexual', 'explicit', 'adult', 'porn', 'xxx',
      'violence', 'blood', 'gore', 'death', 'kill', 'murder',
      'drug', 'alcohol', 'smoke', 'cigarette', 'beer', 'wine',
      'hate', 'racist', 'discrimination', 'offensive'
    ];
    
    return descriptions.map(desc => {
      let sanitized = desc.toLowerCase();
      
      // Remove sensitive keywords
      sensitiveKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
        sanitized = sanitized.replace(regex, '[content filtered]');
      });
      
      // Clean up multiple spaces
      sanitized = sanitized.replace(/\s+/g, ' ').trim();
      
      return sanitized;
    }).filter(desc => desc.length > 0 && !desc.includes('[content filtered]'));
  }

  // Cluster descriptions by semantic similarity using embeddings
  private async clusterDescriptions(descriptions: string[]): Promise<string[][]> {
    if (descriptions.length === 0) return [];
    if (descriptions.length === 1) return [descriptions];

    const MAX_CLUSTERS = 10; // Maximum number of clusters to create
    console.log(`🔍 Clustering ALL ${descriptions.length} user interactions`);

    try {
      // Handle large datasets efficiently
      if (descriptions.length > 100) {
        console.log('📊 Large dataset detected, using batch processing for embeddings...');
      }

      console.log('🔍 Creating embeddings for clustering...');

      // Create embeddings for ALL descriptions (OpenAI handles batching automatically)
      const embeddingResp = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: descriptions,
      });

      const vectors = embeddingResp.data.map(d => d.embedding);
      console.log('📊 Generated embeddings for', vectors.length, 'descriptions');

      // Smart clustering algorithm that uses ALL data but creates max 10 clusters
      const clusters: string[][] = [];
      const used = new Set<number>();

      // First pass: Create initial clusters with high similarity threshold
      for (let i = 0; i < descriptions.length && clusters.length < MAX_CLUSTERS; i++) {
        if (used.has(i)) continue;

        const cluster = [descriptions[i]];
        used.add(i);

        // Find similar descriptions and group them
        for (let j = i + 1; j < descriptions.length; j++) {
          if (!used.has(j)) {
            const similarity = this.cosineSimilarity(vectors[i], vectors[j]);
            if (similarity > 0.75) { // High similarity threshold
              cluster.push(descriptions[j]);
              used.add(j);
            }
          }
        }
        clusters.push(cluster);
      }

      // Second pass: Assign remaining descriptions to existing clusters or create new ones
      const remainingIndices = Array.from({ length: descriptions.length }, (_, i) => i)
        .filter(i => !used.has(i));

      console.log(`📊 First pass created ${clusters.length} clusters, ${remainingIndices.length} items remaining`);

      for (const i of remainingIndices) {
        if (used.has(i)) continue;

        let bestClusterIndex = -1;
        let bestSimilarity = 0;

        // Try to assign to existing clusters first
        if (clusters.length < MAX_CLUSTERS) {
          for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
            const cluster = clusters[clusterIndex];
            if (cluster.length < 10) { // Don't let clusters get too large
              // Check similarity with cluster centroid (first item as representative)
              const representative = descriptions.indexOf(cluster[0]);
              if (representative !== -1) {
                const similarity = this.cosineSimilarity(vectors[i], vectors[representative]);
                if (similarity > 0.6 && similarity > bestSimilarity) {
                  bestSimilarity = similarity;
                  bestClusterIndex = clusterIndex;
                }
              }
            }
          }
        }

        if (bestClusterIndex !== -1) {
          // Add to existing cluster
          clusters[bestClusterIndex].push(descriptions[i]);
          used.add(i);
        } else if (clusters.length < MAX_CLUSTERS) {
          // Create new cluster
          const newCluster = [descriptions[i]];
          used.add(i);

          // Try to find similar items for the new cluster
          for (let j = i + 1; j < descriptions.length; j++) {
            if (!used.has(j) && newCluster.length < 8) {
              const similarity = this.cosineSimilarity(vectors[i], vectors[j]);
              if (similarity > 0.5) { // Lower threshold for new clusters
                newCluster.push(descriptions[j]);
                used.add(j);
              }
            }
          }
          clusters.push(newCluster);
        } else {
          // Max clusters reached, assign to the most similar existing cluster
          let bestFallbackCluster = 0;
          let bestFallbackSimilarity = 0;

          for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
            const cluster = clusters[clusterIndex];
            const representative = descriptions.indexOf(cluster[0]);
            if (representative !== -1) {
              const similarity = this.cosineSimilarity(vectors[i], vectors[representative]);
              if (similarity > bestFallbackSimilarity) {
                bestFallbackSimilarity = similarity;
                bestFallbackCluster = clusterIndex;
              }
            }
          }
          clusters[bestFallbackCluster].push(descriptions[i]);
          used.add(i);
        }
      }

      console.log('🎯 Final result:', clusters.length, 'clusters using ALL', descriptions.length, 'interactions');
      console.log('📊 Cluster sizes:', clusters.map(c => c.length));
      console.log('✅ Total items clustered:', clusters.reduce((sum, c) => sum + c.length, 0));

      return clusters;
    } catch (error) {
      console.error('❌ Error clustering descriptions:', error);
      // Fallback: create up to MAX_CLUSTERS by grouping descriptions sequentially
      const fallbackClusters: string[][] = [];
      const itemsPerCluster = Math.ceil(descriptions.length / MAX_CLUSTERS);

      for (let i = 0; i < descriptions.length; i += itemsPerCluster) {
        const cluster = descriptions.slice(i, i + itemsPerCluster);
        fallbackClusters.push(cluster);
        if (fallbackClusters.length >= MAX_CLUSTERS) break;
      }

      console.log('🔄 Fallback: Created', fallbackClusters.length, 'clusters using ALL interactions');
      return fallbackClusters;
    }
  }

  // Calculate cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  // Generate prompts for each cluster
  private async generatePromptsForClusters(clusters: string[][], structured: {
    duration: string;
  }): Promise<string[]> {
    const allPrompts: string[] = [];
    
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      console.log(`🎨 Generating prompt for cluster ${i + 1}/${clusters.length} with ${cluster.length} items`);
      
      try {
        const prompt = await this.generatePromptForCluster(cluster, structured);
        if (prompt) {
          allPrompts.push(prompt);
        }
      } catch (error) {
        console.error(`❌ Error generating prompt for cluster ${i + 1}:`, error);
      }
    }
    
    return allPrompts;
  }

  // Generate a single prompt for a specific cluster
  private async generatePromptForCluster(cluster: string[], structured: {
    duration: string;
  }): Promise<string> {
    const systemPrompt = `You are an expert AI video prompt generator. Your task is to create sophisticated, safe, and coherent video generation prompts.

Rules:
- Do NOT combine unrelated topics into one prompt
- Keep all outputs safe, family-friendly, and coherent
- Focus on the main theme of the provided descriptions
- Create a single, focused video prompt
- Use professional, engaging language
- Make it specific and actionable for video creation

The prompt should be 1-2 sentences long and focus on the primary theme.`;

    const userPrompt = `Generate a structured video creation prompt based on these related descriptions:

${cluster.map((desc, i) => `${i + 1}. ${desc}`).join('\n')}

Video duration: ${structured.duration}

Create a single, focused video prompt that captures the main theme of these descriptions.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 250,
      temperature: 0.7
    });

    return response.choices[0].message.content?.trim() || '';
  }

  // Combine multiple prompts into a final result with enhanced video generation format
  private combinePrompts(prompts: string[], structured?: {
    subject: string;
    actions: string[];
    style: string;
    setting: string;
    mood: string;
    duration: string;
    lighting: string;
    colors: string[];
  }): string {
    if (prompts.length === 0) {
      return "Create a video based on your preferences. Start by liking some videos or searching for content you enjoy.";
    }

    if (prompts.length === 1) {
      return prompts[0];
    }

    // Extract meaningful key elements from each prompt
    const keyElements = prompts.map((prompt, index) => {
      let element = prompt.trim();
      console.log(`🔍 Processing prompt ${index + 1}:`, element.substring(0, 100) + '...');

      // Remove common video generation prefixes
      element = element.replace(/^(?:Create|Produce|Make|Generate|Film)\s*(?:a|an|the)?\s*/i, '');
      element = element.replace(/\s*(?:video|content|footage)\s*/gi, ' ');
      element = element.replace(/\s*\(\d+-\d+\s*(?:minutes?|seconds?)\)/gi, '');
      element = element.replace(/\s*\(\d+\s*(?:minutes?|seconds?)\)/gi, '');

      // Enhanced pattern matching for better subject extraction
      const subjectPatterns = [
        // Pattern 1: "person/people doing activity" - prioritize human subjects
        /(?:featuring|showing|of)\s+(?:a|an|the)?\s*([a-zA-Z\s]+(?:person|people|man|woman|child|children|individual|group))\s+(?:who|that|performing|doing|playing|dancing|working|engaging)/i,

        // Pattern 2: "adjective + noun + action" - good descriptive subjects
        /(?:featuring|showing|of)?\s*(?:a|an|the)?\s*([a-zA-Z]+\s+[a-zA-Z]+)\s+(?:performing|doing|playing|dancing|cycling|swimming|running|walking|working|creating|practicing)/i,

        // Pattern 3: Main subject at start of cleaned text
        /^(?:a|an|the)?\s*([a-zA-Z\s]{4,20})\s+(?:in|at|on|during|while|performing|doing)/i,

        // Pattern 4: Activity-focused extraction
        /(?:featuring|showing|capturing|documenting)\s+(?:a|an|the)?\s*([a-zA-Z\s]{4,25})/i,

        // Pattern 5: Simple noun phrases
        /^(?:a|an|the)?\s*([a-zA-Z]+(?:\s+[a-zA-Z]+){1,2})/i
      ];

      let extracted = '';
      for (const pattern of subjectPatterns) {
        const match = element.match(pattern);
        if (match && match[1]) {
          let candidate = match[1].trim();

          // Validate the extraction
          if (candidate.length >= 4 && candidate.length <= 30 &&
              !candidate.match(/^(?:the|and|that|with|from|this|they|have|been|were|their|video|content|footage)$/i)) {
            extracted = candidate;
            break;
          }
        }
      }

      // Fallback: extract meaningful noun phrases
      if (!extracted) {
        const words = element.split(/\s+/).filter(word =>
          word.length > 3 &&
          !['the', 'and', 'that', 'with', 'from', 'this', 'they', 'have', 'been', 'were', 'their', 'video', 'content', 'footage', 'scene', 'showing', 'featuring'].includes(word.toLowerCase()) &&
          !word.match(/^(?:performing|doing|playing|dancing|cycling|swimming|running|walking|working|creating|practicing)$/i)
        );

        if (words.length >= 2) {
          extracted = words.slice(0, 2).join(' ');
        } else if (words.length === 1) {
          extracted = words[0];
        }
      }

      // Clean up the extracted subject
      if (extracted) {
        // Remove video-related adjectives
        extracted = extracted.replace(/\b(?:heartwarming|captivating|engaging|dynamic|compelling|informative|cinematic|documentary|thrilling|elaborate|stunning|beautiful|amazing|incredible|professional|high-quality)\b/gi, '');

        // Clean up spacing and punctuation
        extracted = extracted.replace(/\s+/g, ' ').trim();
        extracted = extracted.replace(/^[,.\s]+|[,.\s]+$/g, '');

        // Capitalize first letter of each word
        extracted = extracted.replace(/\b\w/g, l => l.toUpperCase());
      }

      // Final validation and fallback
      if (!extracted || extracted.length < 4 || extracted.match(/^(?:A|The|And|That|With|From)$/i)) {
        extracted = `Content Theme ${index + 1}`;
      }

      console.log(`✅ Extracted subject ${index + 1}:`, extracted);
      return extracted;
    });

    // Create enhanced structured video generation prompt for AI video generators
    const contextDescription = this.generateUserContext(keyElements, structured);
    const structuredPrompt = `# AI Video Generation Prompt

## Context
${contextDescription}

## Video Specifications

### Content
**Main Subjects:**
${keyElements.map(element => `  • ${element}`).join('\n')}

**Actions & Movements:**
${structured?.actions?.map(action => `  • ${action}`) || ['  • engaging activities']}

### Technical Specifications
- **Style:** ${structured?.style || 'cinematic'}
- **Duration:** ${structured?.duration || '30-60 seconds'}
- **Setting:** ${structured?.setting || 'dynamic environments'}
- **Mood/Tone:** ${structured?.mood || 'engaging'}
- **Lighting:** ${structured?.lighting || 'high quality, professional lighting'}
- **Color Palette:** ${(structured?.colors || ['vibrant', 'cohesive']).join(', ')}

### Production Notes
- Focus on visual storytelling
- Maintain consistent style throughout
- Ensure smooth transitions between scenes
- Optimize for social media sharing

---
*Generated from ${prompts.length} personalized content themes*`;

    return structuredPrompt;
  }

  // Generate user context for AI video generators
  private generateUserContext(keyElements: string[], structured?: {
    subject: string;
    actions: string[];
    style: string;
    setting: string;
    mood: string;
    duration: string;
    lighting: string;
    colors: string[];
  }): string {
    // Show ALL user interests clearly
    const allInterests = keyElements.filter(el => el && el !== 'Video content');
    
    // Create a comprehensive context description
    let context = `This user enjoys content about: ${allInterests.join(', ')}`;
    
    // Add style and mood preferences
    context += `. They prefer ${structured?.style || 'cinematic'} style videos with ${structured?.mood || 'engaging'} mood`;
    
    // Add setting preferences if available
    if (structured?.setting && structured.setting !== 'dynamic environments') {
      context += `, often set in ${structured.setting}`;
    }
    
    // Add duration preference
    if (structured?.duration) {
      context += `. Duration preference: ${structured.duration}`;
    }
    
    context += '.';
    
    return context;
  }

  // Fallback prompt generator if OpenAI fails
  private generateFallbackPrompt(keyElements: {
    subjects: string[];
    locations: string[];
    activities: string[];
    specificDetails: string[];
    mood: string;
  }, structured: {
    duration: string;
  }): string {
    let prompt = `Create a video featuring `;
    
    if (keyElements.subjects.length > 0) {
      prompt += `${keyElements.subjects.join(', ')} `;
    }
    
    if (keyElements.locations.length > 0) {
      prompt += `in ${keyElements.locations.join(' and ')} `;
    }
    
    if (keyElements.activities.length > 0) {
      prompt += `with ${keyElements.activities.join(', ')} `;
    }
    
    prompt += `for a ${structured.duration.toLowerCase()} video. `;
    prompt += `Make it visually appealing and engaging based on the content you've shown interest in.`;
    
    return prompt;
  }





  // Extract real elements from actual user content - completely data-driven
  private extractKeyElementsFromContent(descriptions: string[]): {
    subjects: string[];
    locations: string[];
    activities: string[];
    specificDetails: string[];
    mood: string;
  } {
    console.log('🔍 Extracting key elements from', descriptions.length, 'descriptions');
    
    const subjects = new Set();
    const locations = new Set();
    const activities = new Set();
    const specificDetails = new Set();
    const allWords = new Map(); // Track word frequency across ALL descriptions
    const mood = 'engaging';

    // First pass: collect all words and their frequencies
    descriptions.forEach((desc, index) => {
      console.log(`📝 Processing description ${index + 1}:`, desc.substring(0, 100) + '...');
      const words = desc.toLowerCase().split(/\s+/);
      
      words.forEach(word => {
        if (word.length > 3) {
          allWords.set(word, (allWords.get(word) || 0) + 1);
        }
      });
    });

    console.log('📊 Word frequency analysis:', Array.from(allWords.entries()).slice(0, 10));

    // Second pass: extract elements based on frequency and patterns
    descriptions.forEach(desc => {
      const words = desc.toLowerCase().split(/\s+/);
      
      // Extract subjects (nouns that appear frequently across ALL descriptions)
      words.forEach(word => {
        if (word.length > 4 && this.isLikelySubject(word) && allWords.get(word) > 1) {
          subjects.add(word);
        }
      });
      
      // Extract locations - use actual content patterns
      words.forEach(word => {
        if (this.isLikelyLocation(word)) {
          locations.add(word);
        }
      });
      
      // Extract activities - use actual content patterns
      words.forEach(word => {
        if (this.isLikelyActivity(word)) {
          activities.add(word);
        }
      });
      
      // Extract specific details - use actual content patterns
      words.forEach(word => {
        if (this.isLikelyDetail(word)) {
          specificDetails.add(word);
        }
      });
    });

    // Get most frequent subjects across all descriptions
    const frequentSubjects = Array.from(allWords.entries())
      .filter(([word, count]) => count > 1 && this.isLikelySubject(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    console.log('🎯 Extracted elements:', {
      subjects: Array.from(subjects),
      locations: Array.from(locations),
      activities: Array.from(activities),
      specificDetails: Array.from(specificDetails),
      frequentSubjects
    });

    return {
      subjects: frequentSubjects.length > 0 ? frequentSubjects : Array.from(subjects).slice(0, 3) as string[],
      locations: Array.from(locations).slice(0, 2) as string[],
      activities: Array.from(activities).slice(0, 3) as string[],
      specificDetails: Array.from(specificDetails).slice(0, 4) as string[],
      mood
    };
  }

  private isLikelySubject(word: string): boolean {
    // Data-driven heuristic - no hardcoded lists
    return word.length > 4 && 
           !word.includes('ing') && 
           !word.includes('ed') &&
           !word.includes('the') &&
           !word.includes('and') &&
           !word.includes('with') &&
           !word.includes('from');
  }

  private isLikelyLocation(word: string): boolean {
    // Data-driven location detection
    return word.length > 3 && (
      word.includes('place') ||
      word.includes('area') ||
      word.includes('room') ||
      word.includes('space') ||
      word.includes('location') ||
      word.includes('spot') ||
      word.endsWith('ing') && word.length > 6
    );
  }

  private isLikelyActivity(word: string): boolean {
    // Data-driven activity detection
    return word.endsWith('ing') || 
           word.endsWith('ed') ||
           ['walk', 'run', 'jump', 'sit', 'stand', 'look', 'see', 'hear', 'feel', 'play', 'work', 'cook', 'read'].includes(word);
  }

  private isLikelyDetail(word: string): boolean {
    // Data-driven detail detection
    return word.length > 3 && 
           word.length < 10 &&
           !word.includes('ing') &&
           !word.includes('ed') &&
           !word.includes('the') &&
           !word.includes('and');
  }


  // Add custom input from user
  async addCustomInput(userId: string, text: string) {
    return await prisma.customInput.create({
      data: {
        userId,
        text
      }
    });
  }

  // Get user's interaction history
  async getUserHistory(userId: string = 'demo-user-1') {
    const [likedVideos, moreLikeThis, customInputs] = await Promise.all([
      prisma.interaction.findMany({
        where: { userId, type: 'LIKE' },
        include: { video: { select: { title: true, description: true } } }
      }),
      prisma.interaction.findMany({
        where: { userId, type: 'MORE_LIKE_THIS' },
        select: {
          id: true,
          userId: true,
          videoId: true,
          type: true,
          note: true,
          video: { select: { title: true, description: true } }
        }
      }),
      prisma.customInput.findMany({
        where: { userId }
      })
    ]);

    return {
      likedVideos,
      moreLikeThis,
      customInputs,
      totalInteractions: likedVideos.length + moreLikeThis.length + customInputs.length
    };
  }
}

export const promptGenerator = new PromptGenerator();
