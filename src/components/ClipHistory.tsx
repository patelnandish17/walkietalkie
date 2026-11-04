/**
 * ClipHistory: Scrollable feed of recorded walkie-talkie voice clips
 * - Custom audio player supporting audio/mp4 (iOS) and audio/webm (Chromium)
 * - Waveform visualization & scrubber progress bar
 * - "NEW" badge for unheard clips
 * - Mark-as-listened tracking
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Radio, Clock, Sparkles } from 'lucide-react';
import { Transmission } from '../types';
import { radioAudio } from '../lib/audio';
import { triggerHaptic } from '../lib/haptics';

interface ClipHistoryProps {
  transmissions: Transmission[];
  channelName: string;
  onMarkListened: (transId: string) => void;
}

export const ClipHistory: React.FC<ClipHistoryProps> = ({
  transmissions,
  channelName,
  onMarkListened,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ [id: string]: number }>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop playback when unmounting or switching channel
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlay = async (trans: Transmission) => {
    await radioAudio.unlock();
    triggerHaptic('light');

    if (playingId === trans.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio();
    // Use the stored mime_type or fallback
    audio.src = trans.audio_url;
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        const pct = (audio.currentTime / audio.duration) * 100;
        setProgress((prev) => ({ ...prev, [trans.id]: pct }));
      }
    };

    audio.onended = () => {
      setPlayingId(null);
      setProgress((prev) => ({ ...prev, [trans.id]: 0 }));
      onMarkListened(trans.id);
    };

    audio.onerror = (e) => {
      console.warn('Audio playback error:', e);
      setPlayingId(null);
    };

    try {
      await audio.play();
      setPlayingId(trans.id);
      onMarkListened(trans.id);
    } catch (err) {
      console.warn('Autoplay failed or audio not loaded:', err);
    }
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.round(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col h-full px-4 pb-24 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Voice Clips</span>
            <span className="text-xs font-normal text-slate-400">
              in {channelName}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Recordings from live transmissions
          </p>
        </div>

        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
          {transmissions.length} clips
        </span>
      </div>

      {/* Feed List */}
      {transmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl glass-panel my-auto border border-white/10">
          <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-slate-400">
            <Radio className="h-8 w-8" />
          </div>
          <h3 className="text-base font-semibold text-white">No Transmissions Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Hold the Talk button on the radio screen to transmit. Recordings will automatically archive here for offline friends.
          </p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pr-1">
          {transmissions.map((trans) => {
            const isPlaying = playingId === trans.id;
            const currentPct = progress[trans.id] || 0;
            const senderAccent = trans.sender?.accent_color || '#38bdf8';
            const isUnread = !trans.listened_by_me;

            return (
              <div
                key={trans.id}
                className="group relative overflow-hidden rounded-2xl glass-panel p-3.5 border border-white/15 transition-all hover:border-white/30"
              >
                {/* Unread indicator ribbon */}
                {isUnread && (
                  <div className="absolute top-2.5 right-3 flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-400/30">
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>NEW</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* Play / Pause Tactile Glass Button */}
                  <button
                    onClick={() => handleTogglePlay(trans)}
                    className="relative flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center text-white transition-all transform active:scale-95 shadow-md"
                    style={{
                      backgroundColor: `${senderAccent}25`,
                      border: `1px solid ${senderAccent}66`,
                    }}
                    aria-label={isPlaying ? 'Pause transmission' : 'Play transmission'}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" style={{ color: senderAccent }} />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" style={{ color: senderAccent }} />
                    )}
                  </button>

                  {/* Sender details and waveform scrubber */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={trans.sender?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={trans.sender?.display_name || 'Station'}
                          className="h-5 w-5 rounded-full object-cover border"
                          style={{ borderColor: senderAccent }}
                        />
                        <span className="text-xs font-bold text-white truncate">
                          {trans.sender?.display_name || 'Radio Operator'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(trans.duration_ms)}
                        </span>
                        <span>·</span>
                        <span>{formatTimeAgo(trans.created_at)}</span>
                      </div>
                    </div>

                    {/* Waveform Scrubber Visual */}
                    <div className="relative h-6 flex items-center gap-1 bg-white/5 rounded-lg px-2.5 overflow-hidden">
                      {/* Fake stylized waveform bars */}
                      {Array.from({ length: 28 }).map((_, barIdx) => {
                        const seed = (barIdx * 17) % 10;
                        const barHeight = Math.max(4, Math.min(20, 6 + seed * 1.5));
                        const isFilled = (barIdx / 28) * 100 <= currentPct;

                        return (
                          <div
                            key={barIdx}
                            className="flex-1 rounded-full transition-colors duration-150"
                            style={{
                              height: `${barHeight}px`,
                              backgroundColor: isFilled ? senderAccent : 'rgba(255,255,255,0.18)',
                            }}
                          />
                        );
                      })}

                      {/* Playing Progress Bar Line */}
                      {isPlaying && (
                        <div
                          className="absolute bottom-0 left-0 h-0.5 transition-all duration-100"
                          style={{
                            width: `${currentPct}%`,
                            backgroundColor: senderAccent,
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
