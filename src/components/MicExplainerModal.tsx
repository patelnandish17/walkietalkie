/**
 * MicExplainerModal:
 * Friendly explainer modal when mic permission is required or denied
 */

import React from 'react';
import { Mic, Shield, AlertTriangle, X, Radio } from 'lucide-react';

interface MicExplainerModalProps {
  isOpen: boolean;
  isDenied: boolean;
  onClose: () => void;
  onRequestPermission: () => void;
}

export const MicExplainerModal: React.FC<MicExplainerModalProps> = ({
  isOpen,
  isDenied,
  onClose,
  onRequestPermission,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0c101d]/95 border border-white/20 p-6 shadow-2xl text-white text-center">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
          <Mic className="h-8 w-8" />
        </div>

        <h3 className="text-lg font-bold text-white">
          {isDenied ? 'Microphone Access Blocked' : 'Enable Radio Microphone'}
        </h3>

        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          {isDenied
            ? 'Your browser blocked microphone access for this site. Click the lock/settings icon in your address bar and set Microphone to "Allow".'
            : 'Squawk uses your microphone ONLY while you hold the Push-to-Talk button, exactly like a hardware walkie-talkie. It is never active in the background.'}
        </p>

        <div className="my-4 rounded-xl bg-white/5 border border-white/10 p-3 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 mb-1">
            <Shield className="h-3.5 w-3.5" />
            <span>Privacy First Radio</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            No continuous listening. Audio is recorded and broadcast strictly when keying the button.
          </p>
        </div>

        {isDenied ? (
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 py-2.5 text-xs font-bold text-white transition"
          >
            Understood
          </button>
        ) : (
          <button
            onClick={() => {
              onRequestPermission();
              onClose();
            }}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 active:scale-98 transition"
          >
            Allow Microphone Access
          </button>
        )}
      </div>
    </div>
  );
};
