'use client';
import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface QualitySource {
  label: string;
  url: string;
}

export function VideoPlayer({ src, poster, sources }: { src: string; poster?: string; sources?: QualitySource[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      // If multi-resolution sources are provided, use them for quality selection
      const videoSources = sources && sources.length > 0
        ? sources.map(s => ({ src: s.url, type: 'video/mp4', label: s.label }))
        : [{ src, type: 'video/mp4' }];

      const player = videojs(videoRef.current, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        sources: [{ src: videoSources[0].src, type: 'video/mp4' }],
        poster,
        fluid: true,
        responsive: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
      });

      // Register quality levels plugin if available
      if (sources && sources.length > 1) {
        try {
          const qualityLevels = (player as any).qualityLevels?.();
          if (qualityLevels) {
            sources.forEach((s, i) => {
              qualityLevels.addQualityLevel({
                src: s.url,
                type: 'video/mp4',
                label: s.label,
                width: parseInt(s.label) || 360,
              });
            });
            // Set default to lowest bandwidth (360p) for mobile
            qualityLevels.selectedIndex_ = sources.length - 1;
          }
        } catch {
          // Quality levels plugin not available, fall back to basic playback
        }
      }

      playerRef.current = player;
    }
    return () => { if (playerRef.current) { playerRef.current.dispose(); playerRef.current = null; } };
  }, [src, poster, sources]);

  return <div data-vjs-player><video ref={videoRef} className="video-js vjs-big-play-centered" playsInline /></div>;
}
