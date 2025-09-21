import { prisma } from './prisma';

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

    // Extract keywords and themes
    const allDescriptions = [
      ...likedVideos.map(i => i.video.description),
      ...moreLikeThis.map(i => i.video.description),
      ...customInputs.map(i => i.text)
    ];

    // Analyze content to extract structured data
    const analysis = this.analyzeContent(allDescriptions);

    // Generate structured prompt
    const structured = this.generateStructuredPrompt(analysis);

    // Generate natural language prompt
    const prompt = this.generateNaturalPrompt(structured, analysis);

    return {
      structured,
      prompt,
      sources: {
        likedVideos: likedVideos.length,
        moreLikeThis: moreLikeThis.length,
        customInputs: customInputs.length
      }
    };
  }

  // Analyze content to extract themes and keywords
  private analyzeContent(descriptions: string[]): any {
    const allText = descriptions.join(' ').toLowerCase();
    
    // Extract common themes
    const themes = this.extractThemes(allText);
    const actions = this.extractActions(allText);
    const settings = this.extractSettings(allText);
    const moods = this.extractMoods(allText);
    const colors = this.extractColors(allText);
    const lighting = this.extractLighting(allText);

    return {
      themes,
      actions,
      settings,
      moods,
      colors,
      lighting,
      totalItems: descriptions.length
    };
  }

  // Extract common themes from text
  private extractThemes(text: string): string[] {
    const themeKeywords = {
      nature: ['mountain', 'ocean', 'forest', 'sunset', 'sunrise', 'landscape', 'sky', 'cloud', 'tree', 'flower', 'water', 'beach', 'desert', 'valley'],
      urban: ['city', 'street', 'building', 'architecture', 'urban', 'downtown', 'skyline', 'traffic', 'neon', 'modern'],
      lifestyle: ['coffee', 'morning', 'yoga', 'cooking', 'reading', 'garden', 'home', 'relax', 'meditation', 'exercise'],
      travel: ['travel', 'adventure', 'explore', 'journey', 'destination', 'culture', 'historic', 'ancient', 'temple', 'ruins'],
      abstract: ['abstract', 'art', 'creative', 'design', 'pattern', 'geometric', 'color', 'paint', 'digital', 'artistic']
    };

    const foundThemes = [];
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        foundThemes.push(theme);
      }
    }

    return foundThemes;
  }

  // Extract action words
  private extractActions(text: string): string[] {
    const actionWords = [
      'flowing', 'dancing', 'swaying', 'cascading', 'crashing', 'filtering', 'dancing', 'moving',
      'walking', 'running', 'jogging', 'stretching', 'cooking', 'reading', 'painting', 'playing',
      'exploring', 'hiking', 'climbing', 'swimming', 'flying', 'floating', 'spinning', 'rotating'
    ];

    return actionWords.filter(action => text.includes(action));
  }

  // Extract setting descriptions
  private extractSettings(text: string): string[] {
    const settings = [
      'mountain peaks', 'ocean waves', 'forest canopy', 'city skyline', 'desert dunes',
      'tropical beach', 'urban street', 'cozy home', 'ancient temple', 'modern building',
      'peaceful garden', 'busy market', 'quiet library', 'art studio', 'mountain cabin'
    ];

    return settings.filter(setting => text.includes(setting));
  }

  // Extract mood descriptors
  private extractMoods(text: string): string[] {
    const moods = [
      'peaceful', 'energetic', 'serene', 'dramatic', 'mysterious', 'vibrant', 'calm',
      'exciting', 'romantic', 'nostalgic', 'inspiring', 'meditative', 'dynamic', 'tranquil'
    ];

    return moods.filter(mood => text.includes(mood));
  }

  // Extract color references
  private extractColors(text: string): string[] {
    const colors = [
      'golden', 'blue', 'green', 'red', 'purple', 'orange', 'yellow', 'pink', 'silver',
      'crimson', 'azure', 'emerald', 'amber', 'violet', 'coral', 'turquoise', 'magenta'
    ];

    return colors.filter(color => text.includes(color));
  }

  // Extract lighting descriptions
  private extractLighting(text: string): string[] {
    const lighting = [
      'golden light', 'soft light', 'dramatic lighting', 'natural light', 'warm light',
      'cool light', 'backlighting', 'side lighting', 'overhead lighting', 'ambient light'
    ];

    return lighting.filter(light => text.includes(light));
  }

  // Generate structured prompt data
  private generateStructuredPrompt(analysis: any) {
    return {
      subject: analysis.themes[0] || 'general content',
      actions: analysis.actions.slice(0, 3) || ['flowing', 'moving'],
      style: this.determineStyle(analysis),
      setting: analysis.settings[0] || 'beautiful location',
      mood: analysis.moods[0] || 'peaceful',
      duration: this.determineDuration(analysis),
      lighting: analysis.lighting[0] || 'natural lighting',
      colors: analysis.colors.slice(0, 3) || ['warm', 'vibrant']
    };
  }

  // Determine video style based on analysis
  private determineStyle(analysis: any): string {
    if (analysis.themes.includes('abstract')) return 'abstract artistic';
    if (analysis.themes.includes('urban')) return 'urban modern';
    if (analysis.themes.includes('nature')) return 'nature documentary';
    if (analysis.themes.includes('lifestyle')) return 'lifestyle vlog';
    return 'cinematic';
  }

  // Determine duration based on content
  private determineDuration(analysis: any): string {
    if (analysis.totalItems > 10) return 'long-form (2-5 minutes)';
    if (analysis.totalItems > 5) return 'medium (30-60 seconds)';
    return 'short (15-30 seconds)';
  }

  // Generate natural language prompt
  private generateNaturalPrompt(structured: any, analysis: any): string {
    const { subject, actions, style, setting, mood, duration, lighting, colors } = structured;

    let prompt = `Create a ${style} video featuring `;
    
    // Add subject
    prompt += `${subject} content `;
    
    // Add actions
    if (actions.length > 0) {
      prompt += `with ${actions.join(', ')} movements `;
    }
    
    // Add setting
    prompt += `set in a ${setting} `;
    
    // Add mood and lighting
    prompt += `with a ${mood} atmosphere and ${lighting} `;
    
    // Add colors
    if (colors.length > 0) {
      prompt += `using ${colors.join(' and ')} color palette `;
    }
    
    // Add duration
    prompt += `for a ${duration} video. `;
    
    // Add style instructions
    prompt += `The video should be visually stunning, well-composed, and engaging. `;
    
    // Add technical specs
    prompt += `Use high-quality cinematography with smooth camera movements and professional editing.`;

    return prompt;
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
