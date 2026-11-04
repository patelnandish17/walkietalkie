/**
 * WhoIsTalking:
 * Prominent live indicator showing the active speaker, animated frequency bars,
 * and speaker's custom avatar with radiating accent glow.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Mic, RadioTower } from 'lucide-react';
import { LiveAudioEvent } from '../lib/livekit';
import { Channel } from '../types';

interface WhoIsTalkingProps {
  channel: Channel | null;
  activeSpeaker: LiveAudioEvent | null;
  isSelfTalking: boolean;
  selfName: string;
  selfAccentColor: string;
  selfAvatarUrl: string;
  audioLevel?: number; // 0.0 to 1.0
}

export const WhoIsTalking: React.FC<WhoIsTalkingProps> = ({
  channel,
  activeSpeaker,
  isSelfTalking,
  selfName,
  selfAccentColor,
  selfAvatarUrl,
  audioLevel = 0,
}) => {
  const isSomeoneTalking = isSelfTalking || Boolean(activeSpeaker?.isTalking);
  const speakerName = isSelfTalking ? `${selfName} (You)` : activeSpeaker?.senderName || '';
  const accentColor = isSelfTalking ? selfAccentColor : activeSpeaker?.accentColor || '#38bdf8';
  const avatarUrl = isSelfTalking ? selfAvatarUrl : activeSpeaker?.avatarUrl || '';

  return (
    <div className="w-full max-w-sm mx-auto px-4">
      <AnimatePresence mode="wait">
        {isSomeoneTalking ? (
          <motion.div
            key="speaking"
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden rounded-2xl glass-panel p-3.5 border border-white/20 shadow-xl"
            style={{
              boxShadow: `0 0 25px -4px ${accentColor}44`,
            }}
          >
            {/* Subtle background wash in speaker accent color */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{ backgroundColor: accentColor }}
            />

            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Glowing Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="absolute -inset-1 rounded-full animate-ping opacity-30"
                    style={{ backgroundColor: accentColor }}
                  />
                  <img
                    src={avatarUrl}
                    alt={speakerName}
                    className="relative h-11 w-11 rounded-full object-cover border-2 shadow-md"
                    style={{ borderColor: accentColor }}
                  />
                  <div
                    className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-slate-900 flex items-center justify-center"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Mic className="h-2 w-2 text-white" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                    <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: accentColor }}>
                      {isSelfTalking ? 'Transmitting' : 'Receiving'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white truncate drop-shadow-sm">
                    {speakerName}
                  </h4>
                </div>
              </div>

              {/* Animated Waveform Visualizer */}
              <div className="flex items-end gap-1 h-7 px-2">
                {[0.4, 0.9, 0.6, 1.0, 0.7, 0.5, 0.85].map((multiplier, i) => {
                  const dynamicHeight = Math.max(
                    6,
                    Math.min(28, (audioLevel > 0 ? audioLevel : 0.4) * 32 * multiplier + (Math.sin(Date.now() / 150 + i) * 6))
                  );
                  return (
                    <motion.div
                      key={i}
                      animate={{
                        height: [
                          `${dynamicHeight * 0.5}px`,
                          `${dynamicHeight}px`,
                          `${dynamicHeight * 0.7}px`,
                        ],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.35 + i * 0.05,
                        ease: 'easeInOut',
                      }}
                      className="w-1 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between rounded-2xl glass-panel px-4 py-2.5 border border-white/10"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">
                  {channel?.name || 'Channel Standby'}
                </span>
                <span className="text-[11px] font-mono text-slate-400 tracking-tight">
                  {channel?.frequency || '462.5625 MHz'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <RadioTower className="h-3.5 w-3.5 text-cyan-400" />
              <span>Standby</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
