'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { 
  Upload, 
  Video, 
  Image as ImageIcon, 
  X, 
  Loader2,
  Check,
  AlertCircle,
  Eye,
  DollarSign,
  TrendingUp,
  Globe,
  Lock,
  Clock,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

const uploadSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be at most 100 characters'),
  description: z.string().max(5000, 'Description must be at most 5000 characters'),
  category: z.string().min(1, 'Please select a category'),
  tags: z.string().max(500, 'Tags must be at most 500 characters'),
  visibility: z.enum(['public', 'private', 'unlisted']),
  isShort: z.boolean(),
  enableAds: z.boolean(),
  enableComments: z.boolean(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function UploadPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      visibility: 'public',
      isShort: false,
      enableAds: true,
      enableComments: true,
    },
  });

  const watchVisibility = watch('visibility');
  const watchIsShort = watch('isShort');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
      } else if (file.type.startsWith('image/')) {
        setThumbnail(file);
        setThumbnailPreview(URL.createObjectURL(file));
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    },
    maxFiles: 1,
  });

  const onThumbnailDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('image/')) {
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps: getThumbnailProps, getInputProps: getThumbnailInputProps } = useDropzone({
    onDrop: onThumbnailDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
  });

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
  };

  const removeThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview(null);
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!videoFile) {
      toast.error('Please upload a video');
      return;
    }

    setIsUploading(true);
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadProgress(i);
    }

    setUploadComplete(true);
    toast.success('Video uploaded successfully!');
  };

  const categories = [
    'Gaming', 'Music', 'Entertainment', 'Education', 'Sports', 
    'Technology', 'Art', 'Comedy', 'News', 'Science', 'Crypto', 'Lifestyle'
  ];

  if (uploadComplete) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Upload Complete!</h1>
          <p className="text-gray-400 mb-8">
            Your video is being processed and will be available shortly.
          </p>
          <div className="space-y-3">
            <Link href="/dashboard" className="btn-primary w-full block text-center">
              Go to Dashboard
            </Link>
            <button 
              onClick={() => {
                setVideoFile(null);
                setThumbnail(null);
                setThumbnailPreview(null);
                setUploadProgress(0);
                setUploadComplete(false);
                setVideoPreview(null);
              }}
              className="btn-outline w-full"
            >
              Upload Another Video
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-100">
      {/* Header */}
      <div className="bg-dark-200 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white">Upload Video</h1>
          <p className="text-gray-400 mt-1">Share your content with the world</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Upload */}
            <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Video File</h2>
              
              {!videoFile ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                    isDragActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-white/20 hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-white font-medium mb-2">
                    {isDragActive ? 'Drop your video here' : 'Drag and drop your video file'}
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    or click to browse
                  </p>
                  <p className="text-gray-500 text-xs">
                    Supported formats: MP4, MOV, AVI, WebM (Max 10GB)
                  </p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  {videoPreview && (
                    <video
                      src={videoPreview}
                      controls
                      className="w-full aspect-video"
                    />
                  )}
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute top-4 right-4 p-2 bg-black/70 rounded-full hover:bg-black transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                  <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 rounded-lg">
                    <p className="text-white text-sm font-medium">{videoFile.name}</p>
                    <p className="text-gray-400 text-xs">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Uploading...</span>
                    <span className="text-primary text-sm">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Upload */}
            <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Thumbnail (Optional)</h2>
              
              {!thumbnail ? (
                <div
                  {...getThumbnailProps()}
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer 
                           hover:border-primary/50 transition-all"
                >
                  <input {...getThumbnailInputProps()} />
                  <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-300 text-sm">
                    Click to upload a custom thumbnail
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    JPG, PNG, WebP (Recommended: 1280x720)
                  </p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={thumbnailPreview || ''}
                    alt="Thumbnail preview"
                    className="w-full aspect-video object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeThumbnail}
                    className="absolute top-4 right-4 p-2 bg-black/70 rounded-full hover:bg-black transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* Video Details */}
            <div className="bg-dark-200 rounded-2xl border border-white/10 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-white">Video Details</h2>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  placeholder="Enter a compelling title for your video"
                  {...register('title')}
                  className="w-full px-4 py-3 bg-dark-100 rounded-lg border border-white/10 
                           text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell viewers about your video..."
                  {...register('description')}
                  className="w-full px-4 py-3 bg-dark-100 rounded-lg border border-white/10 
                           text-white placeholder-gray-500 focus:outline-none focus:border-primary resize-none"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  {...register('category')}
                  className="w-full px-4 py-3 bg-dark-100 rounded-lg border border-white/10 
                           text-white focus:outline-none focus:border-primary"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-500">{errors.category.message}</p>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  placeholder="gaming, tutorial, tips (comma separated)"
                  {...register('tags')}
                  className="w-full px-4 py-3 bg-dark-100 rounded-lg border border-white/10 
                           text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Add up to 10 tags to help viewers find your video
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Visibility */}
            <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Visibility</h3>
              
              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                  watchVisibility === 'public' ? 'bg-primary/20 border border-primary' : 'bg-dark-100 hover:bg-white/5'
                }`}>
                  <input
                    type="radio"
                    value="public"
                    {...register('visibility')}
                    className="sr-only"
                  />
                  <Globe className={`w-5 h-5 ${watchVisibility === 'public' ? 'text-primary' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-white font-medium">Public</p>
                    <p className="text-gray-400 text-sm">Everyone can see</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                  watchVisibility === 'unlisted' ? 'bg-primary/20 border border-primary' : 'bg-dark-100 hover:bg-white/5'
                }`}>
                  <input
                    type="radio"
                    value="unlisted"
                    {...register('visibility')}
                    className="sr-only"
                  />
                  <Link href="#" className={`w-5 h-5 ${watchVisibility === 'unlisted' ? 'text-primary' : 'text-gray-400'}`}>
                    <Eye className="w-5 h-5" />
                  </Link>
                  <div>
                    <p className="text-white font-medium">Unlisted</p>
                    <p className="text-gray-400 text-sm">Only with link</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                  watchVisibility === 'private' ? 'bg-primary/20 border border-primary' : 'bg-dark-100 hover:bg-white/5'
                }`}>
                  <input
                    type="radio"
                    value="private"
                    {...register('visibility')}
                    className="sr-only"
                  />
                  <Lock className={`w-5 h-5 ${watchVisibility === 'private' ? 'text-primary' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-white font-medium">Private</p>
                    <p className="text-gray-400 text-sm">Only you can see</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Additional Options */}
            <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Additional Options</h3>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-white font-medium">Short Video</p>
                      <p className="text-gray-400 text-sm">For content under 60 seconds</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    {...register('isShort')}
                    className="w-5 h-5 rounded border-gray-600 bg-dark-100 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-white font-medium">Enable Ads</p>
                      <p className="text-gray-400 text-sm">Earn from your video</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    {...register('enableAds')}
                    className="w-5 h-5 rounded border-gray-600 bg-dark-100 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-white font-medium">Allow Comments</p>
                      <p className="text-gray-400 text-sm">Let viewers comment</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    {...register('enableComments')}
                    className="w-5 h-5 rounded border-gray-600 bg-dark-100 text-primary focus:ring-primary"
                  />
                </label>
              </div>
            </div>

            {/* Estimated Earnings */}
            {watchVisibility === 'public' && (
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-2xl p-6 border border-green-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <span className="text-green-500 font-medium">Estimated Earnings</span>
                </div>
                <p className="text-3xl font-bold text-white">$12.00</p>
                <p className="text-gray-400 text-sm mt-1">per 1,000 views</p>
                <p className="text-gray-500 text-xs mt-2">
                  Based on average CPM for your category
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading || !videoFile}
              className="w-full py-3 bg-primary text-white rounded-lg font-semibold 
                       hover:bg-primary/90 transition-colors disabled:opacity-50 
                       disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Video
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
