'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Heart, Search, Edit3, ArrowLeft } from 'lucide-react';

interface UserStats {
  totalLikes: number;
  totalMoreLikeThis: number;
  totalCustomInputs: number;
  recentActivity: Array<{
    id: string;
    type: 'like' | 'more-like-this' | 'custom-input';
    videoTitle: string;
    timestamp: string;
  }>;
}

interface LikedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  timestamp: string;
}

interface MoreLikeThisVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  timestamp: string;
}

interface CustomInput {
  id: string;
  text: string;
  timestamp: string;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showLikedDialog, setShowLikedDialog] = useState(false);
  const [showMoreLikeThisDialog, setShowMoreLikeThisDialog] = useState(false);
  const [showCustomInputsDialog, setShowCustomInputsDialog] = useState(false);
  
  // Dialog data
  const [likedVideos, setLikedVideos] = useState<LikedVideo[]>([]);
  const [moreLikeThisVideos, setMoreLikeThisVideos] = useState<MoreLikeThisVideo[]>([]);
  const [customInputs, setCustomInputs] = useState<CustomInput[]>([]);
  
  // Loading states for dialogs
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [loadingMoreLikeThis, setLoadingMoreLikeThis] = useState(false);
  const [loadingCustomInputs, setLoadingCustomInputs] = useState(false);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/statistics?userId=demo-user-1');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedVideos = async () => {
    try {
      setLoadingLiked(true);
      const response = await fetch('/api/statistics/liked-videos?userId=demo-user-1');
      const data = await response.json();
      setLikedVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching liked videos:', error);
    } finally {
      setLoadingLiked(false);
    }
  };

  const fetchMoreLikeThisVideos = async () => {
    try {
      setLoadingMoreLikeThis(true);
      const response = await fetch('/api/statistics/more-like-this?userId=demo-user-1');
      const data = await response.json();
      setMoreLikeThisVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching more like this videos:', error);
    } finally {
      setLoadingMoreLikeThis(false);
    }
  };

  const fetchCustomInputs = async () => {
    try {
      setLoadingCustomInputs(true);
      const response = await fetch('/api/statistics/custom-inputs?userId=demo-user-1');
      const data = await response.json();
      setCustomInputs(data.inputs || []);
    } catch (error) {
      console.error('Error fetching custom inputs:', error);
    } finally {
      setLoadingCustomInputs(false);
    }
  };

  const handleLikesClick = () => {
    setShowLikedDialog(true);
    fetchLikedVideos();
  };

  const handleMoreLikeThisClick = () => {
    setShowMoreLikeThisDialog(true);
    fetchMoreLikeThisVideos();
  };

  const handleCustomInputsClick = () => {
    setShowCustomInputsDialog(true);
    fetchCustomInputs();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Statistics</h1>
          <p className="text-gray-600 mb-4">Unable to load your statistics data.</p>
          <button
            onClick={fetchUserStats}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">IC</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  InstaClone
                </h1>
              </Link>
              <span className="text-gray-400">/</span>
              <h2 className="text-lg font-semibold text-gray-900">My Statistics</h2>
            </div>
            
            <Link
              href="/"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={handleLikesClick}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLikes}</p>
              </div>
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={handleMoreLikeThisClick}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">More Like This</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMoreLikeThis}</p>
              </div>
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={handleCustomInputsClick}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Edit3 className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Custom Inputs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCustomInputs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    {activity.type === 'like' && <span className="text-red-500">❤️</span>}
                    {activity.type === 'more-like-this' && <span className="text-blue-500">🔍</span>}
                    {activity.type === 'custom-input' && <span className="text-green-500">✏️</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.type === 'like' && 'Liked: '}
                      {activity.type === 'more-like-this' && 'More Like This: '}
                      {activity.type === 'custom-input' && 'Custom Input: '}
                      {activity.videoTitle}
                    </p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </main>

      {/* Liked Videos Dialog */}
      {showLikedDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setShowLikedDialog(false)}></div>
            <div className="relative bg-blue-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden animate-fadeIn animate-slideUp">
              <div className="flex items-center justify-between p-6 border-b border-blue-200">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-600" />
                  Liked Videos ({likedVideos.length})
                </h3>
                <button
                  onClick={() => setShowLikedDialog(false)}
                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                {loadingLiked ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : likedVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {likedVideos.map((video) => (
                      <div key={video.id} className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                        <div className="flex gap-3">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{video.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{video.description}</p>
                            <p className="text-xs text-gray-500 mt-2">{video.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No liked videos yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* More Like This Dialog */}
      {showMoreLikeThisDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setShowMoreLikeThisDialog(false)}></div>
            <div className="relative bg-blue-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden animate-fadeIn animate-slideUp">
              <div className="flex items-center justify-between p-6 border-b border-blue-200">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600" />
                  More Like This Searches ({moreLikeThisVideos.length})
                </h3>
                <button
                  onClick={() => setShowMoreLikeThisDialog(false)}
                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                {loadingMoreLikeThis ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : moreLikeThisVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {moreLikeThisVideos.map((video) => (
                      <div key={video.id} className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                        <div className="flex gap-3">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{video.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{video.description}</p>
                            <p className="text-xs text-gray-500 mt-2">{video.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No "More Like This" searches yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Inputs Dialog */}
      {showCustomInputsDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setShowCustomInputsDialog(false)}></div>
            <div className="relative bg-blue-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden animate-fadeIn animate-slideUp">
              <div className="flex items-center justify-between p-6 border-b border-blue-200">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-green-600" />
                  Custom Inputs ({customInputs.length})
                </h3>
                <button
                  onClick={() => setShowCustomInputsDialog(false)}
                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                {loadingCustomInputs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : customInputs.length > 0 ? (
                  <div className="space-y-3">
                    {customInputs.map((input) => (
                      <div key={input.id} className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                        <p className="text-gray-900">{input.text}</p>
                        <p className="text-xs text-gray-500 mt-2">{input.timestamp}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Edit3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No custom inputs yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
