/**
 * Profile & Settings Component
 * - Profile customization (name, avatar, accent color)
 * - Switch test identity for instant multi-user simulation
 * - Audio test meter & radio static squelch volume
 * - PWA Install status and iOS guide
 */

import React, { useState } from 'react';
import {
  User,
  Sliders,
  Radio,
  Volume2,
  Smartphone,
  Check,
} from 'lucide-react';
import { UserProfile } from '../types';
import { radioAudio } from '../lib/audio';
import { triggerHaptic } from '../lib/haptics';
import { localStore } from '../lib/supabase';

interface ProfileSettingsModalProps {
  currentUser: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onSwitchUser: (newUser: UserProfile) => void;
  onOpenIOSGuide: () => void;
}

const ACCENT_COLORS = [
  { name: 'Sky Cyan', hex: '#38bdf8' },
  { name: 'Electric Violet', hex: '#a855f7' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Neon Rose', hex: '#f43f5e' },
  { name: 'Coral Teal', hex: '#14b8a6' },
];

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
];

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  currentUser,
  onUpdateUser,
  onSwitchUser,
  onOpenIOSGuide,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.display_name);
  const [selectedColor, setSelectedColor] = useState(currentUser.accent_color);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url);
  const [volume, setVolume] = useState(0.7);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const allProfiles = localStore.getProfiles();

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...currentUser,
      display_name: displayName.trim() || currentUser.display_name,
      accent_color: selectedColor,
      avatar_url: avatarUrl,
    };
    onUpdateUser(updated);
    triggerHaptic('medium');
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    radioAudio.setVolume(newVol);
    radioAudio.playTuningTick();
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    radioAudio.setSoundEnabled(next);
    if (next) radioAudio.playPressSquelch();
  };

  const handleTestSquelch = () => {
    radioAudio.playPressSquelch();
    setTimeout(() => {
      radioAudio.playReleaseSquelch();
    }, 350);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col h-full px-4 pb-28 pt-2 overflow-y-auto">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Profile & Radio Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Customize your radio identity and transmission preferences
        </p>
      </div>

      <div className="space-y-4">
        {/* Google Authentication Account Card */}
        <div className="rounded-2xl glass-panel p-4 border border-white/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Google Authentication</h4>
                <p className="text-[11px] text-slate-400">
                  {currentUser.email ? (
                    <span className="text-cyan-300 font-mono">{currentUser.email}</span>
                  ) : (
                    'Link your Google account to sync channels & voice clips'
                  )}
                </p>
              </div>
            </div>

            {currentUser.email ? (
              <button
                type="button"
                onClick={async () => {
                  const { signOutSupabase } = await import('../lib/supabase');
                  await signOutSupabase();
                  window.location.reload();
                }}
                className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-300 transition cursor-pointer"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const { signInWithGoogle } = await import('../lib/supabase');
                  await signInWithGoogle();
                }}
                className="flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Customization Card */}
        <div className="rounded-2xl glass-panel p-4 border border-white/15">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span>Radio Identity</span>
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Display Call Sign
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                maxLength={25}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Accent Glow Frequency
              </label>
              <div className="flex items-center gap-2.5">
                {ACCENT_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => {
                      setSelectedColor(col.hex);
                      triggerHaptic('light');
                    }}
                    className={`h-8 w-8 rounded-full border-2 transition transform active:scale-90 flex items-center justify-center ${
                      selectedColor === col.hex ? 'ring-2 ring-white scale-110' : 'opacity-80'
                    }`}
                    style={{ backgroundColor: col.hex, borderColor: 'rgba(255,255,255,0.4)' }}
                    title={col.name}
                  >
                    {selectedColor === col.hex && (
                      <Check className="h-4 w-4 text-white stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Preset Radio Avatars
              </label>
              <div className="flex items-center gap-2">
                {AVATAR_PRESETS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(url);
                      triggerHaptic('light');
                    }}
                    className={`h-10 w-10 rounded-full overflow-hidden border-2 transition ${
                      avatarUrl === url
                        ? 'border-cyan-400 scale-105 shadow-md shadow-cyan-500/20'
                        : 'border-white/20 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="preset" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 active:scale-[0.98] transition cursor-pointer"
            >
              Update Call Sign & Profile
            </button>
          </form>
        </div>


        {/* Audio & Radio Squelch Settings */}
        <div className="rounded-2xl glass-panel p-4 border border-white/15">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5" />
            <span>Hardware & Sound FX</span>
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  Radio Squelch Static FX
                </span>
                <span className="text-[11px] text-slate-400">
                  Tactile WebAudio key-up chirp & press "kshh"
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  soundEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Radio FX Volume</span>
                <span className="font-mono">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <button
              onClick={handleTestSquelch}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 py-2 text-xs font-semibold text-slate-200 transition active:scale-98 cursor-pointer"
            >
              <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Test Radio "Kshh" Squelch</span>
            </button>
          </div>
        </div>

        {/* iOS PWA Instructions Button */}
        <div className="rounded-2xl glass-panel p-4 border border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">iOS Home Screen Setup</h4>
              <p className="text-[11px] text-slate-400">
                PWA install guide & Web Push notes
              </p>
            </div>
          </div>
          <button
            onClick={onOpenIOSGuide}
            className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            View Steps
          </button>
        </div>
      </div>
    </div>
  );
};
