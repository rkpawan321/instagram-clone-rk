'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Download, Eye, EyeOff, Sparkles } from 'lucide-react';

interface PromptData {
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

interface UserHistory {
  likedVideos: unknown[];
  moreLikeThis: unknown[];
  customInputs: unknown[];
  totalInteractions: number;
}

export default function PromptPage() {
  const router = useRouter();
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [, setUserHistory] = useState<UserHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStructured, setShowStructured] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState('');
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const generatePrompt = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user-1' })
      });
      const data = await response.json();
      setPromptData(data.data);
      setEditablePrompt(data.data.prompt); // Set the editable prompt
    } catch (error) {
      console.error('Error generating prompt:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchUserHistory = async () => {
    try {
      const response = await fetch('/api/prompt?userId=demo-user-1');
      const data = await response.json();
      setUserHistory(data.history);
    } catch (error) {
      console.error('Error fetching user history:', error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editablePrompt);
    // You could add a toast notification here
  };

  const copyIndividualPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    // You could add a toast notification here
  };

  const autoResizeTextarea = useCallback(() => {
    if (textareaRef) {
      textareaRef.style.height = 'auto';
      textareaRef.style.height = textareaRef.scrollHeight + 'px';
    }
  }, [textareaRef]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditablePrompt(e.target.value);
    autoResizeTextarea();
  };

  const handleIndividualPromptChange = (index: number, value: string) => {
    if (!promptData) return;
    
    const newPrompts = [...promptData.prompts];
    newPrompts[index] = value;
    
    // Update the combined prompt by recombining all individual prompts
    const newCombinedPrompt = combinePrompts(newPrompts, promptData.structured);
    
    setPromptData({ 
      ...promptData, 
      prompts: newPrompts,
      prompt: newCombinedPrompt
    });
    setEditablePrompt(newCombinedPrompt);
  };

  const combinePrompts = (prompts: string[], structured?: {
    subject: string;
    actions: string[];
    style: string;
    setting: string;
    mood: string;
    duration: string;
    lighting: string;
    colors: string[];
  }): string => {
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
    
    // Generate user context
    const generateUserContext = (keyElements: string[], structured?: {
      subject: string;
      actions: string[];
      style: string;
      setting: string;
      mood: string;
      duration: string;
      lighting: string;
      colors: string[];
    }): string => {
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
    };

    // Create a structured video generation prompt for AI video generators
    const contextDescription = generateUserContext(keyElements, structured);
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
  };

  const downloadPrompt = () => {
    if (!promptData) return;
    
    // Create modified prompt data with editable prompt
    const modifiedPromptData = {
      ...promptData,
      prompt: editablePrompt
    };
    
    const dataStr = JSON.stringify(modifiedPromptData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-prompt.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchUserHistory();
  }, []);

  useEffect(() => {
    if (editablePrompt && textareaRef) {
      autoResizeTextarea();
    }
  }, [editablePrompt, textareaRef, autoResizeTextarea]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">AI Prompt Generator</h1>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User History */}
        {/* {userHistory && (
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Your Interaction History</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <div className="text-3xl font-bold text-red-600 mb-2">{userHistory.likedVideos.length}</div>
                <div className="text-sm font-medium text-red-700">Liked Videos</div>
                <div className="w-12 h-1 bg-red-300 rounded-full mx-auto mt-2 group-hover:bg-red-400 transition-colors"></div>
              </div>
              <div className="group text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <div className="text-3xl font-bold text-blue-600 mb-2">{userHistory.moreLikeThis.length}</div>
                <div className="text-sm font-medium text-blue-700">More Like This</div>
                <div className="w-12 h-1 bg-blue-300 rounded-full mx-auto mt-2 group-hover:bg-blue-400 transition-colors"></div>
              </div>
              <div className="group text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <div className="text-3xl font-bold text-green-600 mb-2">{userHistory.customInputs.length}</div>
                <div className="text-sm font-medium text-green-700">Custom Inputs</div>
                <div className="w-12 h-1 bg-green-300 rounded-full mx-auto mt-2 group-hover:bg-green-400 transition-colors"></div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full text-sm font-medium text-gray-700">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                Total Interactions: {userHistory.totalInteractions}
              </div>
            </div>
          </div>
        )} */}


        {/* Generate Prompt Button */}
        <div className="text-center mb-8">
          <button
            onClick={generatePrompt}
            disabled={loading}
            className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Generating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Generate AI Prompt</span>
                <div className="group-hover:translate-x-1 transition-transform duration-200">✨</div>
              </div>
            )}
          </button>
        </div>

        {/* Generated Prompt */}
        {promptData && (
          <div className="space-y-8">
            {/* Generated AI Prompt Title */}
            <div className="text-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">Generated AI Prompt</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto"></div>
            </div>

            {/* Individual Cluster Prompts */}
            {promptData.prompts && promptData.prompts.length > 1 && (
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-8">
                <h3 className="text-xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Theme-Based Prompts ({promptData.prompts.length} options)
                </h3>
                <div className="space-y-4">
                  {promptData.prompts.map((prompt, index) => (
                    <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-green-500" />
                              Theme {index + 1}
                            </div>
                            <button
                              onClick={() => copyIndividualPrompt(prompt)}
                              className="group w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md hover:shadow-lg"
                              title="Copy this theme prompt"
                            >
                              <Copy className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                            </button>
                          </div>
                          <textarea
                            value={prompt}
                            onChange={(e) => {
                              handleIndividualPromptChange(index, e.target.value);
                              // Auto-resize this textarea
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            className="w-full min-h-20 bg-transparent text-gray-800 leading-relaxed text-base resize-none border-none outline-none focus:ring-0 overflow-hidden"
                            style={{ height: 'auto' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Combined Natural Language Prompt */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-8">
              <h3 className="text-xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Combined Prompt
              </h3>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                <textarea
                  ref={setTextareaRef}
                  value={editablePrompt}
                  onChange={handlePromptChange}
                  className="w-full min-h-32 bg-transparent text-gray-800 leading-relaxed text-lg font-medium resize-none border-none outline-none focus:ring-0 overflow-hidden"
                  placeholder="Your AI prompt will appear here..."
                  style={{ height: 'auto' }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={copyToClipboard}
                className="group w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-2xl"
                title="Copy Prompt"
              >
                <Copy className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={downloadPrompt}
                className="group w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full hover:from-green-600 hover:to-green-700 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-2xl"
                title="Download JSON"
              >
                <Download className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={() => setShowStructured(!showStructured)}
                className="group w-14 h-14 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full hover:from-gray-600 hover:to-gray-700 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-2xl"
                title={showStructured ? 'Hide Structured Data' : 'Show Structured Data'}
              >
                {showStructured ? <EyeOff className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" /> : <Eye className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />}
              </button>
            </div>

            {/* Structured Data */}
            {showStructured && (
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-8">
                <h3 className="text-xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Structured Data
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 group-hover:shadow-md transition-all duration-200">{promptData.structured.subject}</div>
                  </div>
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200 group-hover:shadow-md transition-all duration-200">{promptData.structured.style}</div>
                  </div>
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Setting</label>
                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200 group-hover:shadow-md transition-all duration-200">{promptData.structured.setting}</div>
                  </div>
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mood</label>
                    <div className="p-4 bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl border border-pink-200 group-hover:shadow-md transition-all duration-200">{promptData.structured.mood}</div>
                  </div>
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 group-hover:shadow-md transition-all duration-200">{promptData.structured.duration}</div>
                  </div>
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lighting</label>
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200 group-hover:shadow-md transition-all duration-200">{promptData.structured.lighting}</div>
                  </div>
                  <div className="group md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 group-hover:shadow-md transition-all duration-200">
                      {promptData.structured.actions.join(', ')}
                    </div>
                  </div>
                  <div className="group md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Colors</label>
                    <div className="p-4 bg-gradient-to-r from-teal-50 to-teal-100 rounded-xl border border-teal-200 group-hover:shadow-md transition-all duration-200">
                      {promptData.structured.colors.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sources */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-8">
              <h3 className="text-xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Prompt Sources (All User Interactions)
              </h3>
              <p className="text-sm text-gray-600 mb-6 text-center">
                This prompt is generated using all your interactions: liked videos, &quot;more like this&quot; selections, and custom search inputs.
              </p>
              <div className="flex justify-center gap-8">
                <div className="group text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-red-600 mb-1">{promptData.sources.likedVideos}</div>
                  <div className="text-xs font-medium text-red-700">Liked Videos</div>
                  <div className="w-8 h-1 bg-red-300 rounded-full mx-auto mt-1 group-hover:bg-red-400 transition-colors"></div>
                </div>
                <div className="group text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{promptData.sources.moreLikeThis}</div>
                  <div className="text-xs font-medium text-blue-700">More Like This</div>
                  <div className="w-8 h-1 bg-blue-300 rounded-full mx-auto mt-1 group-hover:bg-blue-400 transition-colors"></div>
                </div>
                <div className="group text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-green-600 mb-1">{promptData.sources.customInputs}</div>
                  <div className="text-xs font-medium text-green-700">Custom Inputs</div>
                  <div className="w-8 h-1 bg-green-300 rounded-full mx-auto mt-1 group-hover:bg-green-400 transition-colors"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
