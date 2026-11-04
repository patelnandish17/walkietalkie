/**
 * Squawk - Tactile Walkie-Talkie Web App & Installable PWA
 * Powered by Supabase Auth, Postgres Database & Realtime.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Smartphone,
  ChevronDown,
  Plus,
  UserPlus,
} from 'lucide-react';
import { Channel, TabType, Transmission, UserProfile } from './types';
import {
  getSupabase,
  getCurrentSupabaseUser,
  fetchChannels,
  createChannel,
  joinChannelByCode,
  fetchTransmissions,
  localStore,
} from './lib/supabase';
import { radioAudio } from './lib/audio';
import { triggerHaptic } from './lib/haptics';
import { liveKitManager } from './lib/livekit';
import { usePresence } from './hooks/usePresence';
import { usePushToTalk } from './hooks/usePushToTalk';
import { BackgroundMesh } from './components/BackgroundMesh';
import { AudioUnlockGate } from './components/AudioUnlockGate';
import { WhoIsTalking } from './components/WhoIsTalking';
import { PTTButton } from './components/PTTButton';
import { ChannelList } from './components/ChannelList';
import { ClipHistory } from './components/ClipHistory';
import { MemberList } from './components/MemberList';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { CreateJoinModal } from './components/CreateJoinModal';
import { IOSPwaModal, IOSPwaNoticeBanner } from './components/IOSPwaBanner';
import { MicExplainerModal } from './components/MicExplainerModal';
import { BottomTabBar } from './components/BottomTabBar';

export default function App() {
  const [isLightMode, setIsLightMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('talk');

  // Real data state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Modals
  const [createJoinMode, setCreateJoinMode] = useState<'create' | 'join' | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showMicExplainer, setShowMicExplainer] = useState(false);

  // Initialize Auth & Real Data
  useEffect(() => {
    // Clear any previous mock seed items
    localStore.clearMockData();

    async function initUserAndChannels() {
      setIsLoadingAuth(true);
      const supabaseUser = await getCurrentSupabaseUser();
      
      let user: UserProfile;
      if (supabaseUser) {
        user = supabaseUser;
      } else {
        // Default operator identity until Google sign-in
        user = {
          id: 'operator_' + Math.random().toString(36).substring(2, 8),
          display_name: 'Radio Operator',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          accent_color: '#38bdf8',
        };
      }
      setCurrentUser(user);

      // Load real channels for this user
      const userChannels = await fetchChannels(user.id);
      setChannels(userChannels);
      if (userChannels.length > 0) {
        setActiveChannel(userChannels[0]);
      }
      setIsLoadingAuth(false);
    }

    initUserAndChannels();

    // Listen to Supabase Auth state changes (e.g. user logs in with Google)
    const supabase = getSupabase();
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const user = await getCurrentSupabaseUser();
          if (user) {
            setCurrentUser(user);
            const userChannels = await fetchChannels(user.id);
            setChannels(userChannels);
            if (userChannels.length > 0) {
              setActiveChannel(userChannels[0]);
            }
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  // Update transmissions when activeChannel changes
  useEffect(() => {
    if (activeChannel) {
      fetchTransmissions(activeChannel.id).then((history) => {
        setTransmissions(history);
      });

      // Join channel live audio room
      if (currentUser) {
        liveKitManager.joinChannel(activeChannel.id, currentUser);
      }
    } else {
      setTransmissions([]);
    }
  }, [activeChannel, currentUser]);

  // Presence hook
  const {
    members,
    isChannelMuted,
    isListeningMode,
    toggleMute,
    toggleListening,
  } = usePresence(activeChannel?.id || null, currentUser);

  // Callback when transmission is created
  const handleTransmissionCreated = useCallback((newTrans: Transmission) => {
    setTransmissions((prev) => [newTrans, ...prev]);
  }, []);

  // Push-To-Talk hook
  const {
    pttState,
    isHolding,
    isChannelBusy,
    activeSpeaker,
    audioLevel,
    transmissionElapsedMs,
    hasMicPermission,
    pressPTT,
    releasePTT,
  } = usePushToTalk({
    currentChannel: activeChannel,
    currentUser,
    isChannelMuted,
    onTransmissionCreated: handleTransmissionCreated,
  });

  // Calculate unread clips count
  const unreadClipsCount = transmissions.filter((t) => !t.listened_by_me).length;

  // Channel switching
  const handleSelectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    setActiveTab('talk');
  };

  // Real channel creation
  const handleCreateChannel = async (name: string, emoji: string) => {
    if (!currentUser) return;
    const newChan = await createChannel(name, emoji, currentUser);
    if (newChan) {
      setChannels((prev) => [newChan, ...prev.filter((c) => c.id !== newChan.id)]);
      setActiveChannel(newChan);
      setActiveTab('talk');
    }
  };

  // Real join by code
  const handleJoinByCode = async (code: string): Promise<boolean> => {
    if (!currentUser) return false;
    const joined = await joinChannelByCode(code, currentUser);
    if (joined) {
      setChannels((prev) => [joined, ...prev.filter((c) => c.id !== joined.id)]);
      setActiveChannel(joined);
      setActiveTab('talk');
      return true;
    }
    return false;
  };

  // Mark clip as listened
  const handleMarkListened = (transId: string) => {
    if (activeChannel) {
      localStore.markListened(transId, activeChannel.id);
      setTransmissions((prev) =>
        prev.map((t) => (t.id === transId ? { ...t, listened_by_me: true } : t))
      );
    }
  };

  // Prompt mic explainer if permission denied
  useEffect(() => {
    if (hasMicPermission === false) {
      setShowMicExplainer(true);
    }
  }, [hasMicPermission]);

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060810] text-cyan-400">
        <Radio className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-screen flex flex-col justify-between overflow-x-hidden ${
        isLightMode ? 'text-slate-800' : 'text-slate-100'
      }`}
    >
      {/* Background Animated Blobs */}
      <BackgroundMesh isLightMode={isLightMode} />

      {/* Audio Unlock Gate for iOS / Autoplay policy */}
      <AudioUnlockGate />

      {/* Top App Bar Header */}
      <header className="sticky top-0 z-30 pt-safe px-4 py-2.5 backdrop-blur-xl bg-black/20 border-b border-white/10 flex items-center justify-between">
        {/* Brand & Frequency Dial */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white drop-shadow-sm">
                SQUAWK
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#38bdf8] animate-pulse" />
            </div>
            {activeChannel ? (
              <button
                onClick={() => setActiveTab('channels')}
                className="flex items-center gap-1 text-[11px] font-mono text-cyan-300/90 hover:text-cyan-200 transition cursor-pointer"
              >
                <span>{activeChannel.emoji}</span>
                <span className="font-semibold truncate max-w-[110px]">{activeChannel.name}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            ) : (
              <span className="text-[11px] font-mono text-slate-400">Standby · No Channel</span>
            )}
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Mute Channel button */}
          <button
            onClick={() => {
              toggleMute();
              triggerHaptic('light');
            }}
            className={`h-8 w-8 rounded-xl flex items-center justify-center transition border cursor-pointer ${
              isChannelMuted
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                : 'bg-white/10 border-white/15 text-slate-300 hover:bg-white/20'
            }`}
            title={isChannelMuted ? 'Unmute radio' : 'Mute radio'}
            aria-label={isChannelMuted ? 'Unmute radio' : 'Mute radio'}
          >
            {isChannelMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4 text-cyan-400" />
            )}
          </button>

          {/* iOS PWA info button */}
          <button
            onClick={() => {
              setShowIOSModal(true);
              triggerHaptic('light');
            }}
            className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-slate-300 transition cursor-pointer"
            title="iOS PWA Guide"
            aria-label="iOS PWA Guide"
          >
            <Smartphone className="h-4 w-4 text-cyan-300" />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => {
              setIsLightMode(!isLightMode);
              triggerHaptic('light');
            }}
            className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-slate-300 transition cursor-pointer"
            title="Toggle Visual Theme"
            aria-label="Toggle Visual Theme"
          >
            {isLightMode ? (
              <Moon className="h-4 w-4 text-indigo-400" />
            ) : (
              <Sun className="h-4 w-4 text-amber-300" />
            )}
          </button>
        </div>
      </header>

      {/* iOS Audio Notice Banner */}
      <IOSPwaNoticeBanner onOpenModal={() => setShowIOSModal(true)} />

      {/* Main View Port */}
      <main className="flex-1 flex flex-col justify-center items-center w-full max-w-xl mx-auto px-4 py-2">
        {activeTab === 'talk' && (
          <div className="flex-1 flex flex-col items-center justify-between w-full py-4 space-y-6">
            {activeChannel ? (
              <>
                {/* Live active speaker indicator */}
                <WhoIsTalking
                  channel={activeChannel}
                  activeSpeaker={activeSpeaker}
                  isSelfTalking={isHolding}
                  selfName={currentUser.display_name}
                  selfAccentColor={currentUser.accent_color}
                  selfAvatarUrl={currentUser.avatar_url}
                  audioLevel={audioLevel}
                />

                {/* The Hero PTT Button */}
                <PTTButton
                  pttState={pttState}
                  isHolding={isHolding}
                  isChannelBusy={isChannelBusy}
                  isMuted={isChannelMuted}
                  userAccentColor={currentUser.accent_color}
                  audioLevel={audioLevel}
                  elapsedMs={transmissionElapsedMs}
                  onPress={pressPTT}
                  onRelease={releasePTT}
                />

                {/* Tactile Frequency Tuner Pill */}
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2 rounded-2xl glass-panel px-4 py-2 border border-white/15 text-xs">
                    <span className="font-mono text-cyan-400 font-bold tracking-wider">
                      {activeChannel.frequency}
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300 font-medium">
                      {members.filter((m) => m.presence === 'online').length} online
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Empty Channel State */
              <div className="flex flex-col items-center justify-center my-auto p-8 rounded-3xl glass-panel border border-white/15 text-center max-w-sm">
                <div className="h-16 w-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
                  <Radio className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-white">No Channel Tuned In</h3>
                <p className="text-xs text-slate-400 mt-1.5 mb-6 leading-relaxed">
                  Create a private squad frequency or enter an invite code to start transmitting audio.
                </p>

                <div className="flex flex-col w-full gap-2.5">
                  <button
                    onClick={() => setCreateJoinMode('create')}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-cyan-500/20 active:scale-98 transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Squad Channel</span>
                  </button>

                  <button
                    onClick={() => setCreateJoinMode('join')}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 py-2.5 text-xs font-semibold text-slate-200 transition cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4 text-cyan-400" />
                    <span>Join with Invite Code</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'channels' && (
          <ChannelList
            channels={channels}
            activeChannelId={activeChannel?.id || ''}
            onSelectChannel={handleSelectChannel}
            onCreateChannelClick={() => setCreateJoinMode('create')}
            onJoinChannelClick={() => setCreateJoinMode('join')}
            onLeaveChannel={() => {}}
          />
        )}

        {activeTab === 'clips' && (
          <ClipHistory
            transmissions={transmissions}
            channelName={activeChannel?.name || 'Radio Frequency'}
            onMarkListened={handleMarkListened}
          />
        )}

        {activeTab === 'members' && (
          <MemberList
            channelName={activeChannel?.name || 'Station'}
            members={members}
            isChannelMuted={isChannelMuted}
            isListeningMode={isListeningMode}
            onToggleMute={toggleMute}
            onToggleListening={toggleListening}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileSettingsModal
            currentUser={currentUser}
            onUpdateUser={(updated) => {
              setCurrentUser(updated);
              localStore.saveProfile(updated);
            }}
            onSwitchUser={(user) => {
              setCurrentUser(user);
            }}
            onOpenIOSGuide={() => setShowIOSModal(true)}
          />
        )}
      </main>

      {/* Bottom Tactile Navigation Bar */}
      <BottomTabBar
        activeTab={activeTab}
        unreadClipsCount={unreadClipsCount}
        userAccentColor={currentUser.accent_color}
        onTabChange={setActiveTab}
      />

      {/* Create / Join Modal */}
      <CreateJoinModal
        mode={createJoinMode || 'create'}
        isOpen={createJoinMode !== null}
        onClose={() => setCreateJoinMode(null)}
        onCreateChannel={handleCreateChannel}
        onJoinByCode={async (code) => {
          return await handleJoinByCode(code);
        }}
      />

      {/* iOS PWA Installation Guide Modal */}
      <IOSPwaModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />

      {/* Microphone Privacy & Explainer Modal */}
      <MicExplainerModal
        isOpen={showMicExplainer}
        isDenied={hasMicPermission === false}
        onClose={() => setShowMicExplainer(false)}
        onRequestPermission={() => pressPTT()}
      />
    </div>
  );
}
