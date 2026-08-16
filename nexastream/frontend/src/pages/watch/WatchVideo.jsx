"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function WatchVideo({ params }) {
  const router = useRouter();
  const videoId = params?.id;
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (videoId) {
      loadVideo();
    }
  }, [videoId]);

  async function loadVideo() {
    try {
      setLoading(true);
      const [videoRes, commentsRes, recsRes] = await Promise.all([
        api.getVideo(videoId).catch(() => null),
        api.getComments(videoId).catch(() => ({ comments: [] })),
        api.getRecommendations(videoId).catch(() => ({ videos: [] })),
      ]);
      
      setVideo(videoRes?.video || videoRes);
      setComments(commentsRes.comments || []);
      setRecommendations(recsRes.videos || []);
      setIsLive(videoRes?.video?.isLive || false);
    } catch (error) {
      console.error('Failed to load video:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike() {
    try {
      const res = await api.likeVideo(videoId);
      setVideo(prev => ({ ...prev, likes: res.likes }));
      setLiked(true);
    } catch (error) {
      console.error('Failed to like:', error);
    }
  }

  async function handleSubscribe() {
    try {
      const res = await api.subscribe(video?.channelId || video?.channel?.id);
      setSubscribed(res.subscribed);
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    try {
      const res = await api.addComment(videoId, commentText);
      setComments(prev => [res.comment, ...prev]);
      setCommentText('');
    } catch (error) {
      console.error('Failed to comment:', error);
    }
  }

  async function handleTip() {
    const amount = prompt('Enter tip amount (NEXA):', '1');
    if (!amount) return;
    
    try {
      await api.tipCreator(video?.channelId || video?.channel?.id, amount, videoId);
      alert(`Tipped ${amount} NEXA successfully!`);
    } catch (error) {
      alert('Failed to send tip');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-2xl font-bold mb-2">Video Not Found</h2>
          <p className="text-gray-400 mb-4">This video may have been removed or is private.</p>
          <Link href="/" className="bg-purple-600 px-6 py-2 rounded-lg">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            NexaStream
          </Link>
          <div className="flex-1 max-w-md mx-4">
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-gray-700 border border-gray-600 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/studio" className="text-gray-400 hover:text-white">
              + Create
            </Link>
            <Link href="/wallet" className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full text-sm">
              💰 Wallet
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap -mx-4">
          {/* Main Video */}
          <main className="flex-1 px-4 min-w-0">
            {/* Video Player */}
            <div className="relative bg-black rounded-xl overflow-hidden mb-6">
              {isLive ? (
                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-red-900 to-gray-900">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🔴</div>
                    <h2 className="text-2xl font-bold mb-2">LIVE</h2>
                    <p className="text-gray-400">{video.viewers?.toLocaleString() || 0} watching</p>
                  </div>
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <div className="text-6xl mb-4">▶️</div>
                    <p className="text-gray-400">Video Player</p>
                    <p className="text-sm text-gray-500">{video.videoUrl || 'No video URL'}</p>
                  </div>
                </div>
              )}
              
              {/* Live Badge */}
              {isLive && (
                <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                  🔴 LIVE
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-4">{video.title}</h1>
              
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-700">
                {/* Channel Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-xl font-bold">
                    {video.channelName?.[0]?.toUpperCase() || video.channel?.displayName?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold">{video.channelName || video.channel?.displayName || 'Channel'}</span>
                      {video.channel?.isVerified && <span className="text-blue-500">✓</span>}
                    </div>
                    <p className="text-sm text-gray-400">
                      {(video.channel?.subscribers || 0).toLocaleString()} subscribers
                    </p>
                  </div>
                  <button
                    onClick={handleSubscribe}
                    className={`px-4 py-2 rounded-full font-bold transition ${
                      subscribed ? 'bg-gray-600' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {subscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleLike}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full transition ${
                      liked ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {liked ? '👍' : '👍'} 
                    <span>{(video.likes || 0).toLocaleString()}</span>
                  </button>
                  <button
                    onClick={() => navigator.share?.({ title: video.title, url: window.location.href })}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-full hover:bg-gray-700 transition"
                  >
                    ↗️ Share
                  </button>
                  <button
                    onClick={handleTip}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:opacity-90 transition"
                  >
                    💎 Tip
                  </button>
                  <button className="p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                    📋
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="mt-4 bg-gray-800 rounded-xl p-4">
                <div className="flex items-center space-x-4 text-sm mb-2">
                  <span className="font-bold">{video.views?.toLocaleString() || 0} views</span>
                  <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                  {video.category && <span className="px-2 py-0.5 bg-gray-700 rounded">{video.category}</span>}
                </div>
                <p className={`text-gray-300 ${showDescription ? '' : 'line-clamp-2'}`}>
                  {video.description || 'No description available.'}
                </p>
                <button
                  onClick={() => setShowDescription(!showDescription)}
                  className="text-purple-400 text-sm mt-2"
                >
                  {showDescription ? 'Show less' : 'Show more'}
                </button>
              </div>
            </div>

            {/* Comments */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">{comments.length} Comments</h3>
              
              <form onSubmit={handleComment} className="flex space-x-4 mb-6">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-4 py-2 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="bg-purple-600 px-6 py-2 rounded-full font-medium disabled:opacity-50"
                >
                  Comment
                </button>
              </form>

              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-4">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{comment.user?.username || 'User'}</span>
                        <span className="text-sm text-gray-500">{formatTime(comment.createdAt)}</span>
                      </div>
                      <p className="text-gray-300 mt-1">{comment.content}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                        <button className="hover:text-white">👍 {comment.likes || 0}</button>
                        <button className="hover:text-white">Reply</button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {comments.length === 0 && (
                  <p className="text-center text-gray-400 py-8">
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>
            </div>
          </main>

          {/* Sidebar - Recommendations */}
          <aside className="w-96 px-4">
            <h3 className="text-lg font-bold mb-4">Up Next</h3>
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <Link key={rec.id} href={`/watch/${rec.id}`} className="flex space-x-3 bg-gray-800 rounded-xl p-2 hover:bg-gray-750 transition">
                  <div className="relative w-40 flex-shrink-0">
                    <img
                      src={rec.thumbnail || `https://picsum.photos/seed/${rec.id}/320/180`}
                      alt={rec.title}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-xs">
                      {rec.duration || '10:00'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium line-clamp-2 mb-1">{rec.title}</h4>
                    <p className="text-sm text-gray-400">{rec.channelName || 'Channel'}</p>
                    <p className="text-sm text-gray-500">
                      {formatViews(rec.views)} views • {formatTime(rec.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
              
              {recommendations.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No recommendations yet
                </div>
              )}
            </div>

            {/* Live Now */}
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4">🔴 Live Now</h3>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Link key={i} href="#" className="block bg-gray-800 rounded-xl p-3 hover:bg-gray-750">
                    <div className="relative">
                      <img
                        src={`https://picsum.photos/seed/live${i}/320/180`}
                        alt="Live"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <span className="absolute top-2 left-2 bg-red-600 px-2 py-0.5 rounded text-xs font-bold">
                        LIVE
                      </span>
                    </div>
                    <p className="font-medium mt-2">Live Stream #{i}</p>
                    <p className="text-sm text-gray-400">{Math.floor(Math.random() * 5000)} watching</p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function formatViews(views) {
  if (!views) return '0';
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return views;
}

function formatTime(date) {
  if (!date) return 'Recently';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
