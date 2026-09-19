import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Upload,
  Link as LinkIcon,
  Volume2,
  X,
} from 'lucide-react';

interface MediaInputWidgetProps {
  image?: string;
  audio?: string;
  onImageChange: (image: string | undefined) => void;
  onAudioChange: (audio: string | undefined) => void;
  label?: string;
  compact?: boolean;
}

export const MediaInputWidget: React.FC<MediaInputWidgetProps> = ({
  image,
  audio,
  onImageChange,
  onAudioChange,
  label = 'Media Pendukung (Gambar & Suara)',
  compact = false,
}) => {
  const [showImageUrlModal, setShowImageUrlModal] = useState(false);
  const [showAudioUrlModal, setShowAudioUrlModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [tempAudioUrl, setTempAudioUrl] = useState('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // File Upload Handlers
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit ~5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file gambar maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onImageChange(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file audio maksimal 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onAudioChange(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            onAudioChange(reader.result);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon telah diberikan pada browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  // Audio Play/Pause
  const togglePlayAudio = () => {
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

  const formatSecs = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          {/* Image Upload Button */}
          <label
            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center gap-1 ${
              image
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
            title={image ? 'Ubah Gambar Opsi' : 'Tambahkan Gambar ke Opsi'}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden sm:inline">{image ? 'Gbr ✓' : '+Gbr'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageFileUpload}
              className="hidden"
            />
          </label>

          {/* Audio Upload / Record Button */}
          <div className="relative flex items-center">
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 animate-pulse"
                title="Hentikan Rekam Suara"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>{formatSecs(recordingDuration)}</span>
              </button>
            ) : (
              <label
                className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center gap-1 ${
                  audio
                    ? 'bg-teal-600/30 text-teal-300 border-teal-500/50 shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border-slate-700'
                }`}
                title={audio ? 'Ubah Audio Opsi' : 'Tambahkan Audio ke Opsi'}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">{audio ? 'Aud ✓' : '+Aud'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Quick URL modal button */}
          <button
            type="button"
            onClick={() => setShowImageUrlModal(true)}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-750 text-slate-400 hover:text-indigo-300 border border-slate-700 text-xs"
            title="Tempel Link / URL Gambar / Audio"
          >
            <LinkIcon className="w-3 h-3" />
          </button>
        </div>

        {/* Compact Preview of Attached Image & Audio */}
        {(image || audio) && (
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
            {image && (
              <div className="relative group flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                <img
                  src={image}
                  alt="Opsi"
                  className="w-7 h-7 object-cover rounded border border-slate-700"
                />
                <span className="text-[10px] text-slate-300 font-medium">Gambar</span>
                <button
                  type="button"
                  onClick={() => onImageChange(undefined)}
                  className="text-rose-400 hover:text-rose-300 p-0.5"
                  title="Hapus Gambar"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {audio && (
              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                <audio
                  ref={audioRef}
                  src={audio}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="p-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs"
                  title={isPlaying ? 'Jeda Audio' : 'Putar Audio'}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
                <span className="text-[10px] text-teal-300 font-medium">Audio</span>
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.pause();
                    setIsPlaying(false);
                    onAudioChange(undefined);
                  }}
                  className="text-rose-400 hover:text-rose-300 p-0.5"
                  title="Hapus Audio"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal: Input URL Gambar / Audio */}
        {showImageUrlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Input Link URL Media</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowImageUrlModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">URL Gambar:</label>
                  <input
                    type="url"
                    value={tempImageUrl}
                    onChange={(e) => setTempImageUrl(e.target.value)}
                    placeholder="https://contoh.com/gambar.png"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">URL Audio / Suara:</label>
                  <input
                    type="url"
                    value={tempAudioUrl}
                    onChange={(e) => setTempAudioUrl(e.target.value)}
                    placeholder="https://contoh.com/audio.mp3"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImageUrlModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tempImageUrl.trim()) onImageChange(tempImageUrl.trim());
                    if (tempAudioUrl.trim()) onAudioChange(tempAudioUrl.trim());
                    setTempImageUrl('');
                    setTempAudioUrl('');
                    setShowImageUrlModal(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STANDARD / FULL MODE (Used in Stimulus and Question inputs)
  return (
    <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/90 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] text-slate-500">Mendukung file JPG/PNG & Audio MP3/WAV/Mic</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* IMAGE SECTION */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Lampiran Gambar</span>
            </span>
            {image && (
              <button
                type="button"
                onClick={() => onImageChange(undefined)}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                title="Hapus Gambar"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus</span>
              </button>
            )}
          </div>

          {image ? (
            <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 max-h-48 flex items-center justify-center">
              <img
                src={image}
                alt="Lampiran Media"
                className="max-h-44 w-auto object-contain rounded-lg p-1"
              />
              <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                <label className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer hover:bg-indigo-500">
                  Ganti Gambar
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onImageChange(undefined)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500"
                >
                  Hapus
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Unggah Gambar</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setShowImageUrlModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Gunakan Link URL Gambar"
              >
                <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>URL</span>
              </button>
            </div>
          )}
        </div>

        {/* AUDIO SECTION */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Lampiran Suara / Audio Listening</span>
            </span>
            {audio && (
              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsPlaying(false);
                  onAudioChange(undefined);
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                title="Hapus Audio"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus</span>
              </button>
            )}
          </div>

          {audio ? (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-700/80 flex items-center justify-between gap-3">
              <audio
                ref={audioRef}
                src={audio}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95"
                  title={isPlaying ? 'Jeda Audio' : 'Putar Audio'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">Audio Terlampir</p>
                  <p className="text-[10px] text-teal-300">Siap diputar siswa saat ujian</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsPlaying(false);
                  onAudioChange(undefined);
                }}
                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs shrink-0"
                title="Hapus Audio Ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isRecording ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-rose-950/40 border border-rose-500/40 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-bold text-rose-300">Merekam Suara...</span>
                <span className="text-xs font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                  {formatSecs(recordingDuration)}
                </span>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Selesai</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                <Upload className="w-3.5 h-3.5 text-teal-400" />
                <span>Unggah Audio</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={startRecording}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600/30 to-amber-600/30 hover:from-rose-600/40 hover:to-amber-600/40 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                title="Rekam suara langsung melalui Mikrofon"
              >
                <Mic className="w-3.5 h-3.5 text-rose-400" />
                <span>Rekam Mic</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAudioUrlModal(true)}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Gunakan Link URL Audio"
              >
                <LinkIcon className="w-3.5 h-3.5 text-teal-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Input URL Gambar */}
      {showImageUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>Input Tautan / URL Gambar</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowImageUrlModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-semibold">URL Gambar (JPG, PNG, GIF, WebP):</label>
              <input
                type="url"
                value={tempImageUrl}
                onChange={(e) => setTempImageUrl(e.target.value)}
                placeholder="https://contoh.com/gambar-diagram.png"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                Pastikan URL gambar dapat diakses secara publik.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowImageUrlModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tempImageUrl.trim()) {
                    onImageChange(tempImageUrl.trim());
                    setTempImageUrl('');
                  }
                  setShowImageUrlModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
              >
                Pasang Gambar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Input URL Audio */}
      {showAudioUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-teal-400" />
                <span>Input Tautan / URL Audio</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAudioUrlModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-semibold">URL Audio (MP3, WAV, AAC, OGG):</label>
              <input
                type="url"
                value={tempAudioUrl}
                onChange={(e) => setTempAudioUrl(e.target.value)}
                placeholder="https://contoh.com/audio-listening.mp3"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-500">
                Format audio langsung dapat diputar oleh browser siswa saat mengerjakan ujian.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAudioUrlModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tempAudioUrl.trim()) {
                    onAudioChange(tempAudioUrl.trim());
                    setTempAudioUrl('');
                  }
                  setShowAudioUrlModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md"
              >
                Pasang Audio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
