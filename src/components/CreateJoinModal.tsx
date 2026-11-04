/**
 * Create or Join Channel Modal
 */

import React, { useState } from 'react';
import { X, Plus, Hash, Radio, Sparkles } from 'lucide-react';
import { Channel } from '../types';
import { radioAudio } from '../lib/audio';
import { triggerHaptic } from '../lib/haptics';

interface CreateJoinModalProps {
  mode: 'create' | 'join';
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, emoji: string) => void;
  onJoinByCode: (code: string) => boolean | Promise<boolean>;
}

const EMOJI_OPTIONS = ['📻', '⚡', '🦉', '☕', '🌲', '🎮', '🛹', '🚀', '🔥', '🌊', '🎙️', '🛰️'];

export const CreateJoinModal: React.FC<CreateJoinModalProps> = ({
  mode,
  isOpen,
  onClose,
  onCreateChannel,
  onJoinByCode,
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📻');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a channel name');
      return;
    }
    onCreateChannel(name.trim(), emoji);
    radioAudio.playTuningTick();
    triggerHaptic('medium');
    setName('');
    setErrorMsg('');
    onClose();
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Please enter an invite code');
      return;
    }
    const success = await onJoinByCode(cleanCode);
    if (success) {
      radioAudio.playTuningTick();
      triggerHaptic('medium');
      setCode('');
      setErrorMsg('');
      onClose();
    } else {
      setErrorMsg('Channel code not found. Check and try again.');
      triggerHaptic('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0d1220]/95 border border-white/20 p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {mode === 'create' ? (
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Radio className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold text-white">Create New Channel</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Set up a private radio frequency for your squad.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Channel Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midnight Crew"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  maxLength={30}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Channel Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {EMOJI_OPTIONS.map((em) => (
                    <button
                      type="button"
                      key={em}
                      onClick={() => setEmoji(em)}
                      className={`h-10 rounded-xl text-xl flex items-center justify-center transition border ${
                        emoji === em
                          ? 'bg-cyan-500/30 border-cyan-400 shadow-md scale-105'
                          : 'bg-white/5 border-white/10 hover:bg-white/15'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span>Create Channel</span>
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Hash className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold text-white">Join by Code</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Enter a 6-character squad invite code to tune into their radio.
            </p>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Invite Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. SQW001"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl bg-white/10 border border-white/15 px-3.5 py-3 text-center font-mono text-lg font-bold tracking-widest text-cyan-300 placeholder-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 uppercase"
                  maxLength={10}
                  autoFocus
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-medium text-center">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition active:scale-[0.98]"
              >
                <span>Tune into Station</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
