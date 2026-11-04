/**
 * MemberList:
 * Live channel squad with real-time presence (Online / Away / Muted),
 * active talking glow, role tags, and channel audio controls.
 */

import React from 'react';
import { Volume2, VolumeX, Headphones, Shield, Mic, Radio } from 'lucide-react';
import { ChannelMember, PresenceStatus } from '../types';

interface MemberListProps {
  channelName: string;
  members: ChannelMember[];
  isChannelMuted: boolean;
  isListeningMode: boolean;
  onToggleMute: () => void;
  onToggleListening: () => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  channelName,
  members,
  isChannelMuted,
  isListeningMode,
  onToggleMute,
  onToggleListening,
}) => {
  const getStatusBadge = (status: PresenceStatus) => {
    switch (status) {
      case 'online':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            Online
          </span>
        );
      case 'away':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Away
          </span>
        );
      case 'muted':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Muted
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col h-full px-4 pb-24 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Squad Members</span>
            <span className="text-xs font-normal text-slate-400">
              in {channelName}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Realtime presence & radio status
          </p>
        </div>

        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
          {members.length} members
        </span>
      </div>

      {/* Channel Radio Controls Card */}
      <div className="rounded-2xl glass-panel p-3.5 mb-4 border border-white/15 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-cyan-400">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Channel Monitor</h4>
            <p className="text-[11px] text-slate-400">
              {isChannelMuted ? 'Audio output is silenced' : 'Listening for incoming audio'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute Channel Toggle */}
          <button
            onClick={onToggleMute}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 border ${
              isChannelMuted
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                : 'bg-white/10 border-white/15 text-slate-200 hover:bg-white/15'
            }`}
          >
            {isChannelMuted ? (
              <>
                <VolumeX className="h-3.5 w-3.5" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" />
                <span>Mute</span>
              </>
            )}
          </button>

          {/* Listening Mode Toggle */}
          <button
            onClick={onToggleListening}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 border ${
              isListeningMode
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <Headphones className="h-3.5 w-3.5" />
            <span>{isListeningMode ? 'Listening' : 'Deafened'}</span>
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-2.5 overflow-y-auto pr-1">
        {members.map((member) => {
          const profile = member.profile;
          const accentColor = profile?.accent_color || '#38bdf8';
          const isTalking = Boolean(member.is_talking);

          return (
            <div
              key={member.user_id}
              className={`rounded-2xl glass-panel p-3.5 border transition-all ${
                isTalking
                  ? 'border-cyan-400/60 shadow-lg shadow-cyan-500/15'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar with accent ring and active pulse */}
                  <div className="relative flex-shrink-0">
                    {isTalking && (
                      <div
                        className="absolute -inset-1 rounded-full animate-ping opacity-35"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                    <img
                      src={
                        profile?.avatar_url ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                      }
                      alt={profile?.display_name || 'Member'}
                      className="relative h-10 w-10 rounded-full object-cover border-2 shadow-sm"
                      style={{ borderColor: accentColor }}
                    />
                    {isTalking && (
                      <div
                        className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-white shadow-sm border border-slate-900"
                        style={{ backgroundColor: accentColor }}
                      >
                        <Mic className="h-2.5 w-2.5 animate-bounce" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate">
                        {profile?.display_name || 'Station Member'}
                      </h4>
                      {member.role === 'owner' && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/30">
                          <Shield className="h-2.5 w-2.5" />
                          HOST
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      {isTalking ? (
                        <span className="text-xs font-bold text-cyan-400 animate-pulse flex items-center gap-1">
                          <Mic className="h-3 w-3" />
                          Speaking now...
                        </span>
                      ) : (
                        getStatusBadge(member.presence || 'online')
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ backgroundColor: accentColor }}
                    title="User Accent Frequency"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
