/**
 * iOS & Safari Autoplay Audio Unlock Gate
 * Unlocks AudioContext & hardware audio buffers upon initial user gesture.
 */

import React, { useState, useEffect } from 'react';
import { Volume2, Radio, Sparkles } from 'lucide-react';
import { radioAudio } from '../lib/audio';
import { triggerHaptic } from '../lib/haptics';

interface AudioUnlockGateProps {
  onUnlocked?: () => void;
}

export const AudioUnlockGate: React.FC<AudioUnlockGateProps> = ({ onUnlocked }) => {
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    // If already unlocked
    if (radioAudio.getUnlockedStatus()) {
      setIsLocked(false);
    }
  }, []);

  const handleUnlock = async () => {
    await radioAudio.unlock();
    triggerHaptic('medium');
    radioAudio.playTuningTick();
    setIsLocked(false);
    onUnlocked?.();
  };

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm rounded-3xl bg-[#0f1424]/90 border border-white/20 p-6 text-center shadow-2xl text-white">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/30 border border-cyan-400/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
          <Radio className="h-8 w-8 animate-pulse" />
        </div>

        <h3 className="text-xl font-bold tracking-tight text-white">Tune Into Squawk</h3>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          Tap below to enable live walkie-talkie audio and tactile squelch sound effects.
        </p>

        <button
          onClick={handleUnlock}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Volume2 className="h-4 w-4" />
          <span>Tap to Start Radio</span>
        </button>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="h-3 w-3 text-cyan-400" />
          <span>iOS & WebAudio compliant</span>
        </div>
      </div>
    </div>
  );
};
