'use client';
import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      playerRef.current = videojs(videoRef.current, {
        controls: true, autoplay: false, preload: 'auto',
        sources: [{ src, type: 'video/mp4' }], poster, fluid: true,
      });
    }
    return () => { if (playerRef.current) { playerRef.current.dispose(); playerRef.current = null; } };
  }, [src, poster]);

  return <div data-vjs-player><video ref={videoRef} className="video-js vjs-big-play-centered" playsInline /></div>;
}
