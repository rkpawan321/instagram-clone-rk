'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  sources: {
    likedVideos: number;
    moreLikeThis: number;
    customInputs: number;
  };
}

interface UserHistory {
  likedVideos: any[];
  moreLikeThis: any[];
  customInputs: any[];
  totalInteractions: number;
}

export default function PromptPage() {
  const router = useRouter();
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [userHistory, setUserHistory] = useState<UserHistory | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStructured, setShowStructured] = useState(false);

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
    } catch (error) {
      console.error('Error generating prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCustomInput = async () => {
    if (!customInput.trim()) return;

    try {
      const response = await fetch('/api/custom-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: 'demo-user-1', 
          text: customInput.trim() 
        })
      });
      
      if (response.ok) {
        setCustomInput('');
        // Refresh user history
        fetchUserHistory();
      }
    } catch (error) {
      console.error('Error adding custom input:', error);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const downloadPrompt = () => {
    if (!promptData) return;
    
    const dataStr = JSON.stringify(promptData, null, 2);
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
              className="text-blue-600 hover:text-blue-800 font-medium bg-transparent border-none p-0 m-0 cursor-pointer"
            >
              ←
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User History */}
        {userHistory && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Interaction History</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{userHistory.likedVideos.length}</div>
                <div className="text-sm text-gray-600">Liked Videos</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{userHistory.moreLikeThis.length}</div>
                <div className="text-sm text-gray-600">More Like This</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{userHistory.customInputs.length}</div>
                <div className="text-sm text-gray-600">Custom Inputs</div>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">
              Total Interactions: {userHistory.totalInteractions}
            </div>
          </div>
        )}

        {/* Custom Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add Custom Input</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Describe what kind of video you'd like to create..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomInput()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addCustomInput}
              disabled={!customInput.trim()}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>

        {/* Generate Prompt Button */}
        <div className="text-center mb-8">
          <button
            onClick={generatePrompt}
            disabled={loading}
            className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
          >
            {loading ? 'Generating...' : 'Generate AI Prompt'}
          </button>
        </div>

        {/* Generated Prompt */}
        {promptData && (
          <div className="space-y-6">
            {/* Prompt Actions */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Generated AI Prompt</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(promptData.prompt)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Copy Prompt
                </button>
                <button
                  onClick={downloadPrompt}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Download JSON
                </button>
                <button
                  onClick={() => setShowStructured(!showStructured)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  {showStructured ? 'Hide' : 'Show'} Structured Data
                </button>
              </div>
            </div>

            {/* Natural Language Prompt */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Natural Language Prompt</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-800 leading-relaxed">{promptData.prompt}</p>
              </div>
            </div>

            {/* Structured Data */}
            {showStructured && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Structured Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <div className="p-2 bg-gray-50 rounded">{promptData.structured.subject}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                    <div className="p-2 bg-gray-50 rounded">{promptData.structured.style}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Setting</label>
                    <div className="p-2 bg-gray-50 rounded">{promptData.structured.setting}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mood</label>
                    <div className="p-2 bg-gray-50 rounded">{promptData.structured.mood}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <div className="p-2 bg-gray-50 rounded">{promptData.structured.duration}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lighting</label>
                    <div className="p-2 bg-gray-50 rounded">{promptData.structured.lighting}</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
                    <div className="p-2 bg-gray-50 rounded">
                      {promptData.structured.actions.join(', ')}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Colors</label>
                    <div className="p-2 bg-gray-50 rounded">
                      {promptData.structured.colors.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sources */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Prompt Sources</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-600">{promptData.sources.likedVideos}</div>
                  <div className="text-sm text-gray-600">Liked Videos</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{promptData.sources.moreLikeThis}</div>
                  <div className="text-sm text-gray-600">More Like This</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{promptData.sources.customInputs}</div>
                  <div className="text-sm text-gray-600">Custom Inputs</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
