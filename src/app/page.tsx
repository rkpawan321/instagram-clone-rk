'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Sparkles, X, Search, Menu, Settings } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url?: string;
  createdAt: string;
  similarity?: number;
}

interface VideoResponse {
  videos: Video[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

interface SimilarityResponse {
  pagination: any;
  videos: Video[];
  query?: string;
  videoId?: string;
  total: number;
}

export default function Home() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<SimilarityResponse | null>(null);
  const [moreLikeThisDialog, setMoreLikeThisDialog] = useState<{
    isOpen: boolean;
    videoTitle: string;
    videoDescription: string;
    videoId?: string;
  }>({
    isOpen: false,
    videoTitle: '',
    videoDescription: '',
    videoId: undefined
  });
  const [moreLikeThisLoading, setMoreLikeThisLoading] = useState<string | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    total: 0,
    hasMore: false,
  });
  const isLoadingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastScrollTime = useRef(0);

  // Debounce function for API calls
  const debounce = (func: Function, delay: number = 300) => {
    return (...args: any[]) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Throttle function for scroll events
  const throttle = (func: Function, delay: number = 200) => {
    return (...args: any[]) => {
      const now = Date.now();
      if (now - lastScrollTime.current >= delay) {
        lastScrollTime.current = now;
        func(...args);
      }
    };
  };

  const fetchVideos = async (offset = 0, append = false) => {
    // Prevent multiple concurrent calls when appending
    if (append && isLoadingRef.current) return;
    
    try {
      if (append) {
        isLoadingRef.current = true;
      }
      setLoading(true);
      const response = await fetch(`/api/videos?offset=${offset}&limit=20`);
      const data: VideoResponse = await response.json();
      
      if (data && data.videos && Array.isArray(data.videos)) {
        if (append) {
          setVideos(prev => [...prev, ...data.videos]);
        } else {
          setVideos(data.videos);
        }
      } else {
        console.error('Invalid data received from videos API:', data);
      }
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
      if (append) {
        isLoadingRef.current = false;
      }
    }
  };

  const fetchLikedVideos = async () => {
    try {
      const response = await fetch(`/api/interactions?userId=demo-user-1&type=like`);
      const data = await response.json();
      const likedVideoIds = new Set(data.interactions.map((interaction: any) => interaction.videoId));
      console.log('✅ Fetched liked videos:', Array.from(likedVideoIds));
      setLikedVideos(likedVideoIds);
    } catch (error) {
      console.error('Error fetching liked videos:', error);
    }
  };

  const saveCustomInput = async (text: string) => {
    try {
      const response = await fetch('/api/custom-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          userId: 'demo-user-1'
        })
      });
      const data = await response.json();
      console.log('✅ Custom input saved:', data);
    } catch (error) {
      console.error('Error saving custom input:', error);
    }
  };

  const searchSimilar = async (query: string, append = false) => {
    if (!query.trim()) return;
    
    // Prevent multiple concurrent calls
    if (append && isLoadingRef.current) return;
    
    try {
      if (append) {
        isLoadingRef.current = true;
      }
      setLoading(true);
      if (!append) {
        setIsSearching(true);
      }
      
      // Save search query as custom input
      await saveCustomInput(query);
      
      const offset = append ? videos.length : 0;
      const response = await fetch(`/api/similar?q=${encodeURIComponent(query)}&limit=20&offset=${offset}`);
      const data: SimilarityResponse = await response.json();
      
      if (data && data.videos && Array.isArray(data.videos)) {
        if (append) {
          setVideos(prev => [...prev, ...data.videos]);
          setSearchResults(prev => ({
            ...prev,
            videos: [...(prev?.videos || []), ...data.videos],
            total: data.total,
            pagination: data.pagination
          }));
        } else {
          setSearchResults(data);
          setVideos(data.videos);
          setIsSearchMode(true);
          // Scroll to top when showing new search results
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        console.error('Invalid data received from search API:', data);
      }
    } catch (error) {
      console.error('Error searching videos:', error);
    } finally {
      setLoading(false);
      if (!append) {
        setIsSearching(false);
      }
      isLoadingRef.current = false;
    }
  };

  const handleMoreLikeThis = async (videoId: string, videoTitle: string, videoDescription: string, editedDescription?: string) => {
    try {
      setMoreLikeThisLoading(videoId);
      
      // Show the dialog first
      setMoreLikeThisDialog({
        isOpen: true,
        videoTitle,
        videoDescription: editedDescription || videoDescription,
        videoId: videoId
      });
      
      const response = await fetch(`/api/videos/${videoId}/more-like-this`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          editedDescription,
          userId: 'demo-user-1'
        })
      });
      const data: SimilarityResponse = await response.json();
      
      if (data && data.videos && Array.isArray(data.videos)) {
        setSearchResults(data);
        setVideos(data.videos);
        setIsSearchMode(false); // Set to false for "More Like This" mode
        // Scroll to top when showing similar videos
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        console.error('Invalid data received from more-like-this API:', data);
      }
    } catch (error) {
      console.error('Error finding similar videos:', error);
    } finally {
      setMoreLikeThisLoading(null);
    }
  };

  const handleLike = async (videoId: string) => {
    const isCurrentlyLiked = likedVideos.has(videoId);
    
    try {
      if (isCurrentlyLiked) {
        // Unlike the video
        const response = await fetch(`/api/videos/${videoId}/unlike`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'demo-user-1'
          })
        });
        const data = await response.json();
        console.log(data.message);
        
        // Update local state
        setLikedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
      } else {
        // Like the video
        const response = await fetch(`/api/videos/${videoId}/like`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'demo-user-1'
          })
        });
        const data = await response.json();
        console.log(data.message);
        
        // Update local state
        setLikedVideos(prev => new Set(prev).add(videoId));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const resetToFeed = () => {
    setIsSearchMode(false);
    setSearchQuery('');
    setSearchResults(null);
    setMoreLikeThisLoading(null);
    setMoreLikeThisDialog({
      isOpen: false,
      videoTitle: '',
      videoDescription: ''
    });
    fetchVideos();
    // Scroll to top when returning to feed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    fetchVideos();
    fetchLikedVideos();
    
    // Scroll to top on initial page load
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Load developer mode from localStorage
    const savedDeveloperMode = localStorage.getItem('developerMode') === 'true';
    setIsDeveloperMode(savedDeveloperMode);
  }, []);

  // Console log for moreLikeThisDialog changes
  useEffect(() => {
    console.log('🔍 moreLikeThisDialog changed:', moreLikeThisDialog);
  }, [moreLikeThisDialog]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen) {
        const target = event.target as Element;
        // Don't close if clicking on menu items or burger button
        if (!target.closest('.burger-menu') && !target.closest('.menu-drawer')) {
          setIsMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Infinite scroll loading
  useEffect(() => {
    const handleScrollInternal = () => {
      // Determine which pagination to use based on current mode
      const currentPagination = moreLikeThisDialog.isOpen 
        ? searchResults?.pagination 
        : isSearchMode 
          ? searchResults?.pagination 
          : pagination;
      
      if (loading || isLoadingRef.current || !currentPagination?.hasMore) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // More aggressive loading - trigger when within 500px of bottom
      const threshold = 500;
      const isNearBottom = scrollTop + windowHeight >= documentHeight - threshold;
      
      if (isNearBottom) {
        console.log('🔄 Triggering infinite scroll load...', {
          scrollTop,
          windowHeight,
          documentHeight,
          threshold,
          hasMore: currentPagination?.hasMore,
          loading,
          isLoadingRef: isLoadingRef.current
        });
        loadMore();
      }
    };

    // More responsive scroll handler with shorter throttle
    const handleScroll = throttle(handleScrollInternal, 100);

    // Add both scroll and resize listeners for better detection
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [loading, pagination.hasMore, searchResults?.pagination?.hasMore, moreLikeThisDialog.isOpen, isSearchMode]);

  const loadMoreSimilarVideos = async () => {
    if (!moreLikeThisDialog.videoId) return;
    
    // Prevent multiple concurrent calls
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      const offset = videos.length;
      const response = await fetch(`/api/videos/${moreLikeThisDialog.videoId}/more-like-this`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          editedDescription: moreLikeThisDialog.videoDescription,
          userId: 'demo-user-1',
          offset: offset,
          limit: 20
        })
      });
      const data: SimilarityResponse = await response.json();
      
      // Append new videos to existing ones
      if (data && data.videos && Array.isArray(data.videos)) {
        setVideos(prev => [...prev, ...data.videos]);
        setSearchResults(prev => ({
          ...prev,
          videos: [...(prev?.videos || []), ...data.videos],
          total: data.total, // Update the total count
          pagination: data.pagination
        }));
      } else {
        console.error('Invalid data received from API:', data);
      }
    } catch (error) {
      console.error('Error loading more similar videos:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const loadMoreInternal = () => {
    if (moreLikeThisDialog.isOpen) {
      // Handle "More Like This" case - always call more-like-this API
      if (searchResults?.pagination?.hasMore && !loading && !isLoadingRef.current) {
        loadMoreSimilarVideos();
      }
    } else if (isSearchMode && searchQuery) {
      // In search mode, load more search results
      if (searchResults?.pagination?.hasMore && !loading && !isLoadingRef.current) {
        searchSimilar(searchQuery, true);
      }
    } else if (pagination.hasMore && !loading && !isLoadingRef.current) {
      // In normal mode, load more videos
      fetchVideos(pagination.offset + pagination.limit, true);
    }
  };

  // Debounced loadMore function
  const loadMore = debounce(loadMoreInternal, 300);

  const toggleDeveloperMode = () => {
    const newMode = !isDeveloperMode;
    setIsDeveloperMode(newMode);
    localStorage.setItem('developerMode', newMode.toString());
  };

  console.log('🔍 moreLikeThisDialog:', moreLikeThisDialog);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Row - Logo, Title, and Actions */}
          <div className="flex justify-between items-center h-14">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📸</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                InstaClone
              </h1>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {isDeveloperMode && <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  {isSearchMode ? (
                    moreLikeThisDialog.isOpen 
                      ? `${videos.length} similar` 
                      : `${searchResults?.total || 0} results`
                  ) : (
                    `${videos.length} videos`
                  )}
                </span>
              </div>}
              
              {/* Burger Menu */}
              <div className="relative burger-menu">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row - Search Bar */}
          {!moreLikeThisDialog.isOpen && (
            <div className="pb-2">
              <div className="max-w-2xl mx-auto">
                <div className="flex gap-2">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search for videos (e.g., 'sunset over mountains', 'coffee preparation')..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchSimilar(searchQuery)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-200 text-sm"
                  />
                </div>
                
                {/* Close Button */}
                {searchQuery && (
                  <button
                    onClick={resetToFeed}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full transition-colors flex items-center gap-2"
                    title="Clear search"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm font-medium">Clear</span>
                  </button>
                )}
                
                {/* Search Button */}
                <button
                  onClick={() => searchSimilar(searchQuery)}
                  disabled={!searchQuery.trim() || loading || isSearching}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-full font-medium transition-all duration-200 flex items-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      </header>

      {/* Search Results Info */}
      {isSearchMode && searchResults && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {moreLikeThisDialog.isOpen ? (
                <span>
                  Showing videos similar to: <span className="font-semibold text-purple-700">"{moreLikeThisDialog.videoDescription}"</span>
                </span>
              ) : (
                <span>
                  Showing results for: <span className="font-semibold text-purple-700">"{searchResults.query}"</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Searching Message */}
      {isSearching && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center gap-3 text-sm text-gray-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span>
                Searching for: <span className="font-semibold text-blue-700"> {searchQuery} </span>
              </span>
            </div>
          </div>
        </div>
      )}

        {/* Main Content */}
        <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 ${moreLikeThisDialog?.isOpen ? 'pt-30' : searchQuery ? 'pt-20' : 'pt-30'}`}>
        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {/* Shimmer Loading Cards */}
          {(isSearching || moreLikeThisLoading) && (
            <>
              {Array.from({ length: 20 }).map((_, index) => (
                <div key={`shimmer-${index}`} className="bg-white rounded-xl shadow-md overflow-hidden">
                  {/* Shimmer Thumbnail */}
                  <div className="relative h-80 bg-gray-200 animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer"></div>
                  </div>
                  
                  {/* Shimmer Content */}
                  <div className="p-4">
                    {/* Shimmer Title */}
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2">
                      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded"></div>
                    </div>
                    
                    {/* Shimmer Description */}
                    <div className="space-y-2 mb-3">
                      <div className="h-3 bg-gray-200 rounded animate-pulse">
                        <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5">
                        <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/5">
                        <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded"></div>
                      </div>
                    </div>
                    
                    {/* Shimmer Buttons */}
                    <div className="flex gap-2">
                      <div className="flex-1 h-8 bg-gray-200 rounded-lg animate-pulse">
                        <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded-lg"></div>
                      </div>
                      <div className="flex-1 h-8 bg-gray-200 rounded-lg animate-pulse">
                        <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded-lg"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          
          {/* Actual Videos */}
          {!isSearching && !moreLikeThisLoading && videos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              {/* Thumbnail with Overlay Buttons */}
              <div 
                style={{ 
                  position: 'relative',
                  height: '400px', 
                  width: '100%', 
                  backgroundColor: '#f3f4f6',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  onLoad={() => {}}
                  onError={(e) => {
                    console.error('❌ Image failed:', video.thumbnail);
                    // No fallback - let the image fail gracefully
                  }}
                />
                
                {/* More Like This Button - Top Right */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoreLikeThis(video.id, video.title, video.description);
                  }}
                  disabled={moreLikeThisLoading === video.id}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-110"
                  aria-label="More Like This"
                >
                  {moreLikeThisLoading === video.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-200 border-t-purple-500"></div>
                  ) : (
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  )}
                </button>

                {/* Like Button - Bottom Right */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(video.id);
                  }}
                  className="absolute bottom-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-110"
                  aria-label={likedVideos.has(video.id) ? "Unlike" : "Like"}
                >
                  <Heart 
                    className={`h-5 w-5 transition-colors duration-200 ${
                      likedVideos.has(video.id) 
                        ? 'text-red-500 fill-current' 
                        : 'text-gray-600 hover:text-red-500'
                    }`} 
                  />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Video Title - Only show in developer mode */}
                {isDeveloperMode && (
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors">
                    {video.title}
                  </h3>
                )}
                <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                  {video.description}
                </p>
                
                {/* Similarity Score */}
                {video.similarity !== undefined && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${video.similarity * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {(video.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>

        {/* Loading State - Shimmer Cards */}
        {loading && !isSearching && (
          <>
            {Array.from({ length: 20 }).map((_, index) => (
              <div key={`shimmer-${index}`} className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Shimmer Thumbnail */}
                <div className="relative h-80 bg-gray-200 animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer"></div>
                </div>
                
                {/* Shimmer Content */}
                <div className="p-4">
                  {/* Shimmer Title */}
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2">
                    <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded"></div>
                  </div>
                  
                  {/* Shimmer Description */}
                  <div className="space-y-2 mb-3">
                    <div className="h-3 bg-gray-200 rounded animate-pulse">
                      <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5">
                      <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-3/5">
                      <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded"></div>
                    </div>
                  </div>
                  
                  {/* Shimmer Buttons */}
                  <div className="flex gap-2">
                    <div className="flex-1 h-8 bg-gray-200 rounded-lg animate-pulse">
                      <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded-lg"></div>
                    </div>
                    <div className="flex-1 h-8 bg-gray-200 rounded-lg animate-pulse">
                      <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}


        {/* Infinite Scroll Loading Indicator */}
        {loading && pagination.hasMore && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-lg shadow-md">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-200 border-t-purple-500"></div>
              <span className="text-gray-600 font-medium">Loading more videos...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && videos.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">📹</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No videos found</h3>
            <p className="text-gray-500">Try adjusting your search or check back later for new content.</p>
          </div>
        )}
      </main>

        {/* More Like This Header Extension */}
        {moreLikeThisDialog.isOpen && (
          <div className="fixed top-14 left-0 right-0 z-40 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                      <h3 className="text-sm font-semibold text-gray-800">
                        {moreLikeThisLoading ? "Finding similar to" : "Showing similar to"}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-600 ml-4 line-clamp-2">
                      {moreLikeThisDialog?.videoDescription}
                    </p>
                  </div>
                </div>
                   <div className="flex items-center gap-3">
                     {/* {moreLikeThisLoading && (
                       <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm">
                         <div className="flex items-center gap-2">
                           <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-200 border-t-purple-500"></div>
                           <span className="text-sm font-medium text-gray-700">Finding similar videos...</span>
                         </div>
                       </div>
                     )} */}
                     <button
                       onClick={resetToFeed}
                       className="p-2 hover:bg-white/50 rounded-lg transition-all duration-200"
                       aria-label="Close"
                     >
                       <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                       </svg>
                     </button>
                   </div>
              </div>
            </div>
          </div>
        )}

      {/* Right Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop - invisible but clickable */}
          <div 
            className="absolute inset-0"
            onClick={() => setIsMenuOpen(false)}
          ></div>
          
          {/* Drawer */}
          <div className="menu-drawer absolute right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMenuOpen(false);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Menu Items */}
              <div className="flex-1 p-6">
                <div className="space-y-4">
                  <button
                    className="flex items-center gap-4 p-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group w-full text-left"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Statistics button clicked');
                      setIsMenuOpen(false);
                      // Try router first, fallback to window.location
                      try {
                        router.push('/statistics');
                      } catch (error) {
                        console.log('Router failed, using window.location');
                        window.location.href = '/statistics';
                      }
                    }}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">My Statistics</h3>
                      <p className="text-sm text-gray-500">View your interaction analytics</p>
                    </div>
                  </button>
                  
                  <button
                    className="flex items-center gap-4 p-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group w-full text-left"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('AI Prompt button clicked');
                      setIsMenuOpen(false);
                      // Navigate in same tab
                      router.push('/prompt');
                    }}
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <span className="text-lg">🎨</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">AI Prompt Generator</h3>
                      <p className="text-sm text-gray-500">Generate AI prompts from interactions</p>
                    </div>
                  </button>

                  {/* Developer Mode Toggle */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg">⚙️</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Developer Mode</h3>
                          {/* <p className="text-sm text-gray-500">Show video counts and debug info</p> */}
                        </div>
                      </div>
                      <button
                        onClick={toggleDeveloperMode}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                          isDeveloperMode ? 'bg-orange-500' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isDeveloperMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-6 border-t border-gray-200">
                <div className="text-center text-sm text-gray-500">
                  InstaClone v1.0
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
