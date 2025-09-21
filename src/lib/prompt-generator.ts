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
      include: {
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
      ...moreLikeThis.map(i => i.video.description),
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

  // Extract action words - now data-driven
  private extractActions(text: string): string[] {
    const words = text.split(/\s+/);
    const actionWords = words.filter(word => 
      word.endsWith('ing') || 
      word.endsWith('ed') ||
      ['walk', 'run', 'jump', 'sit', 'stand', 'look', 'see', 'hear', 'feel', 'play', 'perform', 'show', 'create', 'make', 'build', 'design'].includes(word.toLowerCase())
    );
    
    // Count frequency and return most common actions
    const actionCount: { [key: string]: number } = {};
    actionWords.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord.length > 2) {
        actionCount[cleanWord] = (actionCount[cleanWord] || 0) + 1;
      }
    });
    
    const sortedActions = Object.entries(actionCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
    
    return sortedActions.length > 0 ? sortedActions : ['engaging activities'];
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

    try {
      console.log('🔍 Creating embeddings for clustering...');
      
      const embeddingResp = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: descriptions,
      });

      const vectors = embeddingResp.data.map(d => d.embedding);
      console.log('📊 Generated embeddings for', vectors.length, 'descriptions');

      // Simple similarity-based grouping
      const clusters: string[][] = [];
      const used = new Set<number>();

      for (let i = 0; i < descriptions.length; i++) {
        if (used.has(i)) continue;
        
        const cluster = [descriptions[i]];
        used.add(i);

        for (let j = i + 1; j < descriptions.length; j++) {
          if (!used.has(j)) {
            const similarity = this.cosineSimilarity(vectors[i], vectors[j]);
            if (similarity > 0.8) { // High similarity threshold
              cluster.push(descriptions[j]);
              used.add(j);
            }
          }
        }
        clusters.push(cluster);
      }

      console.log('🎯 Created', clusters.length, 'clusters:', clusters.map(c => c.length));
      return clusters;
    } catch (error) {
      console.error('❌ Error clustering descriptions:', error);
      // Fallback: return each description as its own cluster
      return descriptions.map(desc => [desc]);
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

  // Combine multiple prompts into a final result
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
    
    // Extract key elements from each prompt for the structured format
    const keyElements = prompts.map(prompt => {
      // Very simple approach: just get the main subject from the prompt
      let element = prompt.trim();
      
      // Remove common prefixes and duration specs
      element = element.replace(/^(?:Create|Produce|Make|Generate)\s*(?:a|an|the)?\s*/i, '');
      element = element.replace(/\s*\(\d+-\d+\s*minutes?\)/gi, '');
      element = element.replace(/\s*\(\d+\s*minutes?\)/gi, '');
      element = element.replace(/^(?:long-form\s+)?video\s*/i, '');
      
      // Look for the main subject by finding key nouns and their descriptors
      // Try to find patterns like "a [adjective] [noun]" or "[noun] [action]"
      const mainSubjectPatterns = [
        // Pattern 1: "a [adjective] [noun] [doing something]"
        /(?:a|an|the)\s+(\w+\s+\w+)\s+(?:performing|standing|playing|dancing|cycling|interaction|match|day|performance|beach|dog|cat|bird|child|woman|girl|volleyball|wheelies|boogie|board)/i,
        // Pattern 2: "[adjective] [noun] [action]"
        /(\w+\s+\w+)\s+(?:performing|standing|playing|dancing|cycling|interaction|match|day|performance)/i,
        // Pattern 3: "[noun] [action]"
        /(\w+)\s+(?:performing|standing|playing|dancing|cycling|interaction|match|day|performance)/i,
        // Pattern 4: "a [adjective] [noun]"
        /(?:a|an|the)\s+(\w+\s+\w+)/i,
        // Pattern 5: "[adjective] [noun]"
        /(\w+\s+\w+)/i
      ];
      
      let extracted = '';
      for (const pattern of mainSubjectPatterns) {
        const match = element.match(pattern);
        if (match && match[1] && match[1].length > 3) {
          extracted = match[1].trim();
          break;
        }
      }
      
      // If no pattern matched, try to get meaningful words
      if (!extracted || extracted.length < 3) {
        const words = element.split(/\s+/).filter(word => 
          word.length > 2 && 
          !['the', 'and', 'that', 'with', 'from', 'this', 'they', 'have', 'been', 'were', 'their', 'n', 'a', 'an'].includes(word.toLowerCase())
        );
        if (words.length >= 2) {
          extracted = words.slice(0, 2).join(' ');
        } else if (words.length === 1) {
          extracted = words[0];
        } else {
          extracted = 'diverse content';
        }
      }
      
      // Clean up
      extracted = extracted.replace(/\b(heartwarming|captivating|engaging|dynamic|compelling|informative|long-form|short-form|cinematic|documentary|video|content|footage|scene|shot|sequence|showcasing|capturing|featuring|highlighting|emphasizing|documenting|exploring|celebrates|celebrating|thrilling|elaborate|within)\b/gi, '');
      extracted = extracted.replace(/\s+/g, ' ').trim();
      extracted = extracted.replace(/^[,.\s]+|[,.\s]+$/g, '');
      
      // Final validation
      if (extracted.length < 3 || extracted === 'n' || extracted === 'a' || extracted === 'the' || extracted === 'their') {
        extracted = 'diverse content';
      }
      
      return extracted;
    });
    
    // Create a structured video generation prompt for AI video generators
    const contextDescription = this.generateUserContext(keyElements, structured);
    const structuredPrompt = `video_prompt:
  context: "${contextDescription}"
  subject:
${keyElements.map(element => `    - "${element}"`).join('\n')}
  style: "${structured?.style || 'cinematic'}"
  setting: "${structured?.setting || 'dynamic environments'}"
  mood: "${structured?.mood || 'engaging'}"
  duration: "${structured?.duration || '30-60 seconds'}"
  lighting: "${structured?.lighting || 'high quality'}"
  colors:
${(structured?.colors || ['vibrant', 'cohesive']).map(color => `    - "${color}"`).join('\n')}`;
    
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

  // Analyze user's content patterns for sophisticated prompt generation
  private analyzeUserProfile(analysis: {
    rawDescriptions: string[];
    totalItems: number;
  }): {
    complexityLevel: string;
    diversityLevel: string;
    engagementLevel: string;
    themes: {
      visual: string[];
      emotional: string[];
      narrative: string[];
      technical: string[];
      cultural: string[];
    };
    totalInteractions: number;
    avgDescriptionLength: number;
  } {
    const { rawDescriptions, totalItems } = analysis;
    
    // Analyze content complexity
    const avgDescriptionLength = rawDescriptions.reduce((sum: number, desc: string) => sum + desc.length, 0) / rawDescriptions.length;
    const complexityLevel = avgDescriptionLength > 100 ? 'high' : avgDescriptionLength > 50 ? 'medium' : 'low';
    
    // Analyze content diversity
    const uniqueWords = new Set(rawDescriptions.join(' ').toLowerCase().split(/\s+/));
    const diversityLevel = uniqueWords.size > 200 ? 'high' : uniqueWords.size > 100 ? 'medium' : 'low';
    
    // Analyze engagement level
    const engagementLevel = totalItems > 20 ? 'high' : totalItems > 10 ? 'medium' : 'low';
    
    // Analyze content themes
    const themes = this.extractContentThemes(rawDescriptions);
    
    return {
      complexityLevel,
      diversityLevel,
      engagementLevel,
      themes,
      totalInteractions: totalItems,
      avgDescriptionLength
    };
  }

  // Extract sophisticated content themes
  private extractContentThemes(descriptions: string[]): {
    visual: string[];
    emotional: string[];
    narrative: string[];
    technical: string[];
    cultural: string[];
  } {
    const allText = descriptions.join(' ').toLowerCase();
    
    // Advanced theme detection
    const themes = {
      visual: this.detectVisualThemes(allText),
      emotional: this.detectEmotionalThemes(allText),
      narrative: this.detectNarrativeThemes(allText),
      technical: this.detectTechnicalThemes(allText),
      cultural: this.detectCulturalThemes(allText)
    };
    
    return themes;
  }

  // Detect visual themes from content
  private detectVisualThemes(text: string): string[] {
    const visualKeywords = {
      'cinematic': ['cinematic', 'film', 'movie', 'dramatic', 'epic', 'grand'],
      'documentary': ['documentary', 'real', 'authentic', 'natural', 'candid'],
      'artistic': ['artistic', 'creative', 'abstract', 'surreal', 'experimental'],
      'lifestyle': ['lifestyle', 'daily', 'routine', 'personal', 'intimate'],
      'travel': ['travel', 'adventure', 'exploration', 'journey', 'destination']
    };
    
    const foundThemes = [];
    for (const [theme, keywords] of Object.entries(visualKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        foundThemes.push(theme);
      }
    }
    
    return foundThemes;
  }

  // Detect emotional themes from content
  private detectEmotionalThemes(text: string): string[] {
    const emotionalKeywords = {
      'nostalgic': ['nostalgic', 'memories', 'past', 'childhood', 'remember'],
      'inspiring': ['inspiring', 'motivational', 'uplifting', 'positive', 'hope'],
      'melancholic': ['melancholic', 'sad', 'lonely', 'quiet', 'contemplative'],
      'energetic': ['energetic', 'dynamic', 'exciting', 'vibrant', 'lively'],
      'peaceful': ['peaceful', 'calm', 'serene', 'tranquil', 'meditative']
    };
    
    const foundThemes = [];
    for (const [theme, keywords] of Object.entries(emotionalKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        foundThemes.push(theme);
      }
    }
    
    return foundThemes;
  }

  // Detect narrative themes from content
  private detectNarrativeThemes(text: string): string[] {
    const narrativeKeywords = {
      'storytelling': ['story', 'narrative', 'tale', 'journey', 'adventure'],
      'character': ['character', 'person', 'people', 'individual', 'portrait'],
      'environment': ['environment', 'setting', 'place', 'location', 'space'],
      'action': ['action', 'movement', 'activity', 'event', 'happening'],
      'concept': ['concept', 'idea', 'theme', 'message', 'meaning']
    };
    
    const foundThemes = [];
    for (const [theme, keywords] of Object.entries(narrativeKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        foundThemes.push(theme);
      }
    }
    
    return foundThemes;
  }

  // Detect technical themes from content
  private detectTechnicalThemes(text: string): string[] {
    const technicalKeywords = {
      'lighting': ['lighting', 'light', 'shadow', 'bright', 'dark', 'illumination'],
      'composition': ['composition', 'framing', 'angle', 'perspective', 'shot'],
      'color': ['color', 'palette', 'hue', 'tone', 'saturation', 'vibrant'],
      'movement': ['movement', 'motion', 'camera', 'tracking', 'panning'],
      'editing': ['editing', 'cut', 'transition', 'sequence', 'rhythm']
    };
    
    const foundThemes = [];
    for (const [theme, keywords] of Object.entries(technicalKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        foundThemes.push(theme);
      }
    }
    
    return foundThemes;
  }

  // Detect cultural themes from content
  private detectCulturalThemes(text: string): string[] {
    const culturalKeywords = {
      'urban': ['urban', 'city', 'street', 'downtown', 'metropolitan'],
      'nature': ['nature', 'wilderness', 'outdoor', 'landscape', 'environment'],
      'cultural': ['cultural', 'tradition', 'heritage', 'custom', 'ritual'],
      'modern': ['modern', 'contemporary', 'current', 'today', 'now'],
      'timeless': ['timeless', 'classic', 'eternal', 'universal', 'everlasting']
    };
    
    const foundThemes = [];
    for (const [theme, keywords] of Object.entries(culturalKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        foundThemes.push(theme);
      }
    }
    
    return foundThemes;
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
        include: { video: { select: { title: true, description: true } } }
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
