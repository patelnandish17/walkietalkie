/**
 * ChannelList:
 * Browse, switch, create, and join walkie-talkie frequency channels.
 */

import React, { useState } from 'react';
import { Plus, UserPlus, Radio, Volume2, Copy, Check, Hash } from 'lucide-react';
import { Channel } from '../types';
import { radioAudio } from '../lib/audio';
import { triggerHaptic } from '../lib/haptics';

interface ChannelListProps {
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channel: Channel) => void;
  onCreateChannelClick: () => void;
  onJoinChannelClick: () => void;
  onLeaveChannel: (channelId: string) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannelClick,
  onJoinChannelClick,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleChannelClick = (channel: Channel) => {
    if (channel.id === activeChannelId) return;
    radioAudio.playTuningTick();
    triggerHaptic('light');
    onSelectChannel(channel);
  };

  const handleCopyInvite = (e: React.MouseEvent, inviteCode: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(inviteCode);
    triggerHaptic('light');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col h-full px-4 pb-24 pt-2">
      {/* Header & Actions */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Radio Channels</span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              {channels.length} active
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Switch frequency or join friend groups
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onJoinChannelClick}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition active:scale-95 shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Join Code</span>
          </button>

          <button
            onClick={onCreateChannelClick}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Channel Cards */}
      <div className="space-y-2.5 overflow-y-auto pr-1">
        {channels.map((chan) => {
          const isActive = chan.id === activeChannelId;

          return (
            <div
              key={chan.id}
              onClick={() => handleChannelClick(chan)}
              className={`relative overflow-hidden rounded-2xl p-4 transition-all cursor-pointer border ${
                isActive
                  ? 'bg-white/15 border-cyan-400/50 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-400/30'
                  : 'glass-panel border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {/* Active tuning highlight bar */}
              {isActive && (
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500" />
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Emoji Badge */}
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400/40'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {chan.emoji}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">
                        {chan.name}
                      </h3>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-400/30">
                          <Volume2 className="h-2.5 w-2.5 animate-pulse" />
                          TUNED IN
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-1">
                      <span className="text-cyan-400/90">{chan.frequency}</span>
                      <span>·</span>
                      <span>{chan.member_count || 3} members</span>
                    </div>
                  </div>
                </div>

                {/* Invite Code button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleCopyInvite(e, chan.invite_code)}
                    className="flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 px-2.5 py-1 text-[11px] font-mono text-slate-300 transition"
                    title="Click to copy invite code"
                  >
                    <Hash className="h-3 w-3 text-cyan-400" />
                    <span>{chan.invite_code}</span>
                    {copiedCode === chan.invite_code ? (
                      <Check className="h-3 w-3 text-emerald-400 ml-1" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-400 ml-1 opacity-60" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
