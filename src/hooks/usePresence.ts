/**
 * Hook for managing channel member presence: Online, Away, Muted
 */

import { useState, useEffect, useCallback } from 'react';
import { ChannelMember, PresenceStatus, UserProfile } from '../types';
import { localStore } from '../lib/supabase';

export function usePresence(channelId: string | null, currentUser: UserProfile | null) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [myStatus, setMyStatus] = useState<PresenceStatus>('online');
  const [isChannelMuted, setIsChannelMuted] = useState(false);
  const [isListeningMode, setIsListeningMode] = useState(true);

  // Initialize members and listen for realtime presence events
  useEffect(() => {
    if (!channelId || !currentUser) return;

    // Load profiles to populate members
    const profiles = localStore.getProfiles();
    const initialMembers: ChannelMember[] = profiles.map((p, idx) => ({
      channel_id: channelId,
      user_id: p.id,
      role: p.id === currentUser.id ? 'owner' : 'member',
      muted: false,
      joined_at: new Date(Date.now() - 3600000 * (idx + 1)).toISOString(),
      profile: p,
      presence: p.id === currentUser.id ? myStatus : idx === 1 ? 'online' : idx === 2 ? 'away' : 'online',
      is_talking: false,
    }));

    setMembers(initialMembers);

    // Broadcast channel presence listener
    const unsubscribe = localStore.subscribe((event) => {
      if (event.type === 'presence_update') {
        const payload = event.payload as {
          userId: string;
          channelId: string;
          status: PresenceStatus;
          muted?: boolean;
        };

        if (payload.channelId === channelId) {
          setMembers((prev) =>
            prev.map((m) =>
              m.user_id === payload.userId
                ? { ...m, presence: payload.status, muted: payload.muted ?? m.muted }
                : m
            )
          );
        }
      } else if (event.type === 'ptt_active_speaker') {
        const payload = event.payload as { senderId: string; channelId: string; isTalking: boolean };
        if (payload.channelId === channelId) {
          setMembers((prev) =>
            prev.map((m) =>
              m.user_id === payload.senderId
                ? { ...m, is_talking: payload.isTalking }
                : m
            )
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [channelId, currentUser, myStatus]);

  // Handle visibility change (e.g. mobile screen lock / tab hidden -> Away)
  useEffect(() => {
    if (!channelId || !currentUser) return;

    const handleVisibilityChange = () => {
      const newStatus: PresenceStatus = document.hidden ? 'away' : isChannelMuted ? 'muted' : 'online';
      setMyStatus(newStatus);
      localStore.emit('presence_update', {
        userId: currentUser.id,
        channelId,
        status: newStatus,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [channelId, currentUser, isChannelMuted]);

  // Toggle channel mute
  const toggleMute = useCallback(() => {
    setIsChannelMuted((prev) => {
      const next = !prev;
      const status: PresenceStatus = next ? 'muted' : 'online';
      setMyStatus(status);
      if (channelId && currentUser) {
        localStore.emit('presence_update', {
          userId: currentUser.id,
          channelId,
          status,
          muted: next,
        });
      }
      return next;
    });
  }, [channelId, currentUser]);

  // Toggle listening mode (radio monitor)
  const toggleListening = useCallback(() => {
    setIsListeningMode((prev) => !prev);
  }, []);

  return {
    members,
    myStatus,
    isChannelMuted,
    isListeningMode,
    toggleMute,
    toggleListening,
  };
}
