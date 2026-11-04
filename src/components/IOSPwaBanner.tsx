/**
 * iOS PWA Guidance & Add to Home Screen Modal
 * Explains iOS Safari audio lifecycle and steps to install to Home Screen
 */

import React, { useState } from 'react';
import { Share, PlusSquare, Info, X, Radio, BellRing, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface IOSPwaBannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSPwaModal: React.FC<IOSPwaBannerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0c101c]/95 border border-white/20 p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 flex items-center justify-center border border-cyan-400/30">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Install Squawk on iOS</h3>
            <p className="text-xs text-slate-400">Get the full full-screen walkie-talkie PWA</p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3.5 my-5">
          <div className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-3">
            <div className="h-7 w-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
              1
            </div>
            <div className="text-xs text-slate-300 leading-relaxed">
              Open this page in <span className="text-white font-semibold">Safari</span> on your iPhone or iPad, then tap the <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold"><Share className="h-3.5 w-3.5 inline" /> Share</span> icon in the toolbar.
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-3">
            <div className="h-7 w-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
              2
            </div>
            <div className="text-xs text-slate-300 leading-relaxed">
              Scroll down the share sheet and tap <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold"><PlusSquare className="h-3.5 w-3.5 inline" /> Add to Home Screen</span>.
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-3">
            <div className="h-7 w-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
              3
            </div>
            <div className="text-xs text-slate-300 leading-relaxed">
              Tap <span className="text-white font-semibold">Add</span> in the top right. Launch Squawk from your home screen for standalone tactile mode!
            </div>
          </div>
        </div>

        {/* iOS Audio Lifecycle Note */}
        <div className="rounded-2xl bg-cyan-950/40 border border-cyan-500/30 p-3.5 text-xs text-cyan-200/90 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-cyan-300 mb-1">
            <BellRing className="h-3.5 w-3.5" />
            <span>Audio Background Note</span>
          </div>
          On iOS Safari & PWAs, live WebRTC walkie-talkie audio plays while the app is active on screen. Missed transmissions are saved to your <strong className="text-white">Clip History</strong> with Web Push notifications.
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 py-2.5 text-xs font-bold text-white transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export const IOSPwaNoticeBanner: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  const [dismissed, setDismissed] = useState(false);
  const { isInstalled, isIOS } = usePWAInstall();

  // Only show on iOS or when not running standalone
  if (dismissed || isInstalled) return null;

  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-2">
      <div className="relative flex items-center justify-between gap-3 rounded-2xl glass-panel p-3 border border-cyan-400/25 bg-cyan-950/20 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <Radio className="h-4 w-4 text-cyan-400 flex-shrink-0" />
          <p className="text-[11px] text-slate-200 truncate">
            {isIOS
              ? 'iPhone note: Live audio plays while open. Clips are saved for later.'
              : 'Install Squawk PWA for tactile standalone experience.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onOpenModal}
            className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 underline decoration-cyan-400/50"
          >
            {isIOS ? 'PWA Guide' : 'Install'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
            aria-label="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
