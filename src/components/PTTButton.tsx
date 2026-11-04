/**
 * PTTButton: The Hero Walkie-Talkie Push-to-Talk Glass Orb
 * - Touch & pointer events with iOS isolation (touch-action: none, user-select: none)
 * - Concentric radiating ripples during transmission
 * - Scales to 0.95 on active press
 * - Channel Busy lockouts
 * - Audio level expansion
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Lock, Radio, AlertCircle } from 'lucide-react';
import { PTTState } from '../hooks/usePushToTalk';

interface PTTButtonProps {
  pttState: PTTState;
  isHolding: boolean;
  isChannelBusy: boolean;
  isMuted?: boolean;
  userAccentColor: string;
  audioLevel?: number; // 0.0 to 1.0
  elapsedMs: number;
  onPress: () => void;
  onRelease: () => void;
}

export const PTTButton: React.FC<PTTButtonProps> = ({
  pttState,
  isHolding,
  isChannelBusy,
  isMuted = false,
  userAccentColor,
  audioLevel = 0,
  elapsedMs,
  onPress,
  onRelease,
}) => {
  // Format elapsed seconds e.g. "0:04 / 1:00"
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const formattedTime = `0:${elapsedSec < 10 ? '0' : ''}${elapsedSec}`;

  // Prevent context menu and touch callout
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isChannelBusy || isMuted) return;
    onPress();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    onRelease();
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    e.preventDefault();
    onRelease();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isChannelBusy || isMuted) return;
    onPress();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    onRelease();
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-6">
      {/* Concentric Radiating Rings when transmitting */}
      <AnimatePresence>
        {isHolding && (
          <>
            <motion.div
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{
                scale: [1, 1.45, 1.6],
                opacity: [0.6, 0.25, 0],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="absolute h-64 w-64 rounded-full pointer-events-none -z-10"
              style={{
                border: `2px solid ${userAccentColor}`,
                boxShadow: `0 0 35px ${userAccentColor}55`,
              }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{
                scale: [1, 1.25, 1.4],
                opacity: [0.7, 0.35, 0],
              }}
              transition={{
                duration: 1.6,
                delay: 0.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="absolute h-64 w-64 rounded-full pointer-events-none -z-10"
              style={{
                border: `2px solid ${userAccentColor}`,
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Main Tactile Button Container */}
      <div className="relative flex items-center justify-center">
        {/* Glow halo behind button */}
        <div
          className="absolute -inset-4 rounded-full blur-2xl transition-opacity duration-300 pointer-events-none"
          style={{
            backgroundColor: isChannelBusy
              ? '#f43f5e'
              : isHolding
              ? userAccentColor
              : '#38bdf8',
            opacity: isHolding ? 0.55 : isChannelBusy ? 0.3 : 0.15,
          }}
        />

        {/* Circular PTT Button */}
        <motion.button
          type="button"
          aria-label={isChannelBusy ? 'Channel busy' : 'Push to talk button'}
          aria-pressed={isHolding}
          disabled={isChannelBusy || isMuted}
          onContextMenu={handleContextMenu}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          animate={{
            scale: isHolding ? 0.95 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 25,
          }}
          className={`ptt-button-tactile relative h-56 w-56 sm:h-64 sm:w-64 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200 outline-none focus:outline-none ${
            isChannelBusy
              ? 'cursor-not-allowed opacity-90'
              : isMuted
              ? 'cursor-not-allowed opacity-60'
              : 'active:shadow-inner'
          }`}
          style={{
            background: isChannelBusy
              ? 'radial-gradient(circle at 35% 30%, rgba(244,63,94,0.3) 0%, rgba(30,12,20,0.85) 60%, rgba(15,7,12,0.98) 100%)'
              : isHolding
              ? `radial-gradient(circle at 35% 30%, ${userAccentColor}55 0%, rgba(15,23,42,0.85) 60%, rgba(8,12,22,0.98) 100%)`
              : 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18) 0%, rgba(18,24,38,0.82) 55%, rgba(9,13,22,0.98) 100%)',
            border: isChannelBusy
              ? '2px solid rgba(244,63,94,0.6)'
              : isHolding
              ? `2px solid ${userAccentColor}`
              : '2px solid rgba(255,255,255,0.22)',
            boxShadow: isHolding
              ? `0 0 45px -5px ${userAccentColor}88, inset 0 2px 14px rgba(255,255,255,0.3)`
              : isChannelBusy
              ? '0 0 35px -5px rgba(244,63,94,0.6), inset 0 2px 10px rgba(244,63,94,0.3)'
              : '0 20px 45px -10px rgba(0,0,0,0.6), inset 0 2px 16px rgba(255,255,255,0.15)',
          }}
        >
          {/* Subtle Outer Concentric Ring Track */}
          <div className="absolute inset-2.5 rounded-full border border-white/10 pointer-events-none" />
          <div className="absolute inset-5 rounded-full border border-dashed border-white/5 pointer-events-none" />

          {/* Dynamic Audio Level Ring during Transmission */}
          {isHolding && (
            <motion.div
              className="absolute inset-1 rounded-full pointer-events-none"
              style={{
                border: `3px solid ${userAccentColor}`,
                opacity: 0.3 + (audioLevel || 0.3) * 0.7,
              }}
              animate={{
                scale: [1, 1 + (audioLevel || 0.1) * 0.05, 1],
              }}
              transition={{ duration: 0.15, repeat: Infinity }}
            />
          )}

          {/* Center Icon & Status Label */}
          <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
            {isChannelBusy ? (
              <>
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  <Lock className="h-7 w-7 animate-pulse" />
                </div>
                <span className="text-base font-bold tracking-wide text-rose-400">
                  Channel Busy
                </span>
                <span className="text-[11px] text-rose-300/80 mt-0.5 font-medium">
                  Wait for speaker to finish
                </span>
              </>
            ) : isMuted ? (
              <>
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <span className="text-base font-bold tracking-wide text-slate-300">
                  Muted
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Unmute to transmit
                </span>
              </>
            ) : isHolding ? (
              <>
                <div
                  className="mb-2 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg"
                  style={{
                    backgroundColor: userAccentColor,
                    boxShadow: `0 0 20px ${userAccentColor}`,
                  }}
                >
                  <Mic className="h-8 w-8 animate-bounce" />
                </div>
                <span className="text-lg font-extrabold tracking-wide text-white drop-shadow">
                  TRANSMITTING
                </span>
                <span
                  className="font-mono text-xs font-semibold mt-1 tracking-wider"
                  style={{ color: userAccentColor }}
                >
                  {formattedTime} / 1:00
                </span>
              </>
            ) : (
              <>
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-cyan-300 border border-white/20 shadow-inner group-hover:scale-105 transition-transform">
                  <Radio className="h-8 w-8 text-cyan-300" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
                  HOLD TO TALK
                </span>
                <span className="text-[11px] font-medium text-slate-400 mt-1">
                  Release to transmit
                </span>
              </>
            )}
          </div>
        </motion.button>
      </div>

      {/* Desktop Spacebar & Mobile Gesture Hint */}
      <div className="mt-5 flex items-center gap-2 text-xs text-slate-400/90 font-medium">
        <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md bg-white/10 border border-white/15 px-2 py-0.5 text-[11px] font-mono text-slate-300 shadow-sm">
          SPACEBAR
        </kbd>
        <span className="hidden sm:inline">or hold button to talk</span>
        <span className="sm:hidden">Touch & hold anywhere on button</span>
      </div>
    </div>
  );
};
