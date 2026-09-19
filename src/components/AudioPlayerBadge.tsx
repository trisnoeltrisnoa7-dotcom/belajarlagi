import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';

interface AudioPlayerBadgeProps {
  src: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  autoPlay?: boolean;
}

export const AudioPlayerBadge: React.FC<AudioPlayerBadgeProps> = ({
  src,
  title = 'Audio Listening / Penjelasan Suara',
  size = 'md',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {});
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (size === 'sm') {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-teal-950/80 border border-teal-500/40 text-teal-200 text-xs shadow-sm"
      >
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
        <button
          type="button"
          onClick={togglePlay}
          className="w-5 h-5 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer"
          title={isPlaying ? 'Jeda' : 'Putar'}
        >
          {isPlaying ? <Pause className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-0.5" />}
        </button>
        <span className="text-[10px] font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="p-3 rounded-2xl bg-gradient-to-r from-teal-950/70 to-slate-900 border border-teal-500/40 text-teal-100 shadow-md space-y-2"
    >
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-950/60 transition-transform active:scale-95 cursor-pointer"
            title={isPlaying ? 'Jeda Audio' : 'Putar Audio'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs font-semibold cursor-pointer"
            title="Putar Ulang dari Awal (Reset Audio)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <p className="text-xs font-bold text-white truncate">{title}</p>
            </div>
            <p className="text-[10px] text-teal-300/80">Audio Player CBT Resmi</p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-teal-300 shrink-0 bg-teal-950/90 px-2 py-1 rounded-lg border border-teal-800/60">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
        <div
          className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
