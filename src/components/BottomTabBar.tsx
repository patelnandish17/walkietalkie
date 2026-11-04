/**
 * BottomTabBar: Mobile-first bottom navigation bar
 * Safe-area insets, min 44px touch targets, tactile transitions.
 */

import React from 'react';
import { Radio, Users, PlaySquare, Sliders, ListFilter } from 'lucide-react';
import { TabType } from '../types';
import { radioAudio } from '../lib/audio';
import { triggerHaptic } from '../lib/haptics';

interface BottomTabBarProps {
  activeTab: TabType;
  unreadClipsCount: number;
  userAccentColor: string;
  onTabChange: (tab: TabType) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  unreadClipsCount,
  userAccentColor,
  onTabChange,
}) => {
  const handleTabClick = (tab: TabType) => {
    if (tab === activeTab) return;
    triggerHaptic('light');
    radioAudio.playTuningTick();
    onTabChange(tab);
  };

  const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'channels', label: 'Channels', icon: ListFilter },
    { id: 'talk', label: 'Talk', icon: Radio },
    { id: 'clips', label: 'Clips', icon: PlaySquare },
    { id: 'members', label: 'Squad', icon: Users },
    { id: 'profile', label: 'Profile', icon: Sliders },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 pb-safe pt-2 bg-gradient-to-t from-[#060810] via-[#090d18]/90 to-transparent backdrop-blur-xl border-t border-white/10"
    >
      <div className="max-w-md mx-auto px-4 flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          const isTalkHero = tab.id === 'talk';

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-all duration-200 ${
                isActive ? 'scale-105' : 'opacity-65 hover:opacity-100'
              }`}
            >
              {/* Talk Hero Button Elevated Glass Orb */}
              {isTalkHero ? (
                <div
                  className={`-mt-4 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all shadow-lg ${
                    isActive
                      ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white border-white/40 shadow-cyan-500/40'
                      : 'bg-[#121828] text-cyan-400 border-cyan-400/30'
                  }`}
                  style={{
                    boxShadow: isActive ? `0 0 16px ${userAccentColor}88` : undefined,
                  }}
                >
                  <IconComponent className="h-6 w-6" />
                </div>
              ) : (
                <div className="relative">
                  <IconComponent
                    className={`h-5 w-5 ${
                      isActive ? 'text-cyan-400' : 'text-slate-300'
                    }`}
                  />
                  {tab.id === 'clips' && unreadClipsCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-extrabold text-slate-950 shadow-md">
                      {unreadClipsCount}
                    </span>
                  )}
                </div>
              )}

              <span
                className={`text-[10px] font-semibold mt-1 transition-colors ${
                  isActive ? 'text-white drop-shadow-sm' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>

              {/* Active Tab Underline Indicator */}
              {isActive && !isTalkHero && (
                <div
                  className="absolute -bottom-1 h-0.5 w-4 rounded-full"
                  style={{ backgroundColor: userAccentColor }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
