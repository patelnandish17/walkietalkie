/**
 * Push-To-Talk State Machine Hook
 * Manages pointer events, spacebar shortcut, WebAudio radio squelch,
 * channel locking ("Channel busy"), LiveKit microphone activation,
 * and transmission saving.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Channel, Transmission, UserProfile } from '../types';
import { radioAudio } from '../lib/audio';
import { triggerHaptic } from '../lib/haptics';
import { liveKitManager, LiveAudioEvent } from '../lib/livekit';
import { localStore } from '../lib/supabase';
import { useAudioRecorder } from './useAudioRecorder';

export type PTTState = 'idle' | 'holding' | 'busy' | 'error';

interface UsePushToTalkProps {
  currentChannel: Channel | null;
  currentUser: UserProfile | null;
  isChannelMuted?: boolean;
  onTransmissionCreated?: (transmission: Transmission) => void;
}

export function usePushToTalk({
  currentChannel,
  currentUser,
  isChannelMuted = false,
  onTransmissionCreated,
}: UsePushToTalkProps) {
  const [pttState, setPttState] = useState<PTTState>('idle');
  const [activeSpeaker, setActiveSpeaker] = useState<LiveAudioEvent | null>(null);
  const [transmissionElapsedMs, setTransmissionElapsedMs] = useState(0);

  const {
    hasPermission,
    audioLevel,
    requestStream,
    startRecording,
    stopRecording,
  } = useAudioRecorder();

  const isHoldingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Sync active speaker from LiveKit / broadcast
  useEffect(() => {
    liveKitManager.setSpeakerChangeListener((speaker) => {
      setActiveSpeaker(speaker);
    });

    return () => {
      liveKitManager.setSpeakerChangeListener(() => {});
    };
  }, []);

  // Compute if channel is busy (someone else is talking)
  const isChannelBusy = Boolean(
    activeSpeaker &&
    activeSpeaker.isTalking &&
    activeSpeaker.senderId !== currentUser?.id
  );

  // Release transmission safely
  const releasePTT = useCallback(async () => {
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;
    setPttState('idle');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 1. Play Roger Beep + Squelch Release Sound
    radioAudio.playReleaseSquelch();
    triggerHaptic('light');

    // 2. Stop audio recording
    const recordResult = await stopRecording();

    // 3. Stop LiveKit transmission
    if (currentUser && currentChannel) {
      await liveKitManager.stopTalking(
        currentUser,
        recordResult?.dataUrl,
        recordResult?.mimeType
      );

      // 4. Save transmission to Supabase Storage / clip history
      if (recordResult && recordResult.durationMs >= 400) {
        const { uploadVoiceClip } = await import('../lib/supabase');
        const newTrans = await uploadVoiceClip(
          currentChannel.id,
          currentUser,
          recordResult.blob,
          recordResult.durationMs,
          recordResult.mimeType,
          recordResult.dataUrl
        );
        onTransmissionCreated?.(newTrans);
      }
    }

    setTransmissionElapsedMs(0);
  }, [currentUser, currentChannel, stopRecording, onTransmissionCreated]);

  // Press / Hold PTT
  const pressPTT = useCallback(async () => {
    if (!currentUser || !currentChannel) return;
    if (isChannelMuted) return;

    // Check if channel is currently busy
    if (isChannelBusy) {
      triggerHaptic('error');
      setPttState('busy');
      return;
    }

    if (isHoldingRef.current) return;

    // Ensure audio hardware is unlocked
    await radioAudio.unlock();

    // Request microphone access
    const stream = await requestStream();
    if (!stream) {
      setPttState('error');
      return;
    }

    // Check again if someone keyed up in the meantime
    const canTalk = await liveKitManager.startTalking(currentUser);
    if (!canTalk) {
      triggerHaptic('error');
      setPttState('busy');
      return;
    }

    isHoldingRef.current = true;
    setPttState('holding');

    // 1. Play tactile Key-Down squelch & vibration
    radioAudio.playPressSquelch();
    triggerHaptic('medium');

    // 2. Start recording
    await startRecording();

    // 3. Start timer
    startTimeRef.current = Date.now();
    setTransmissionElapsedMs(0);
    timerRef.current = window.setInterval(() => {
      setTransmissionElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
  }, [
    currentUser,
    currentChannel,
    isChannelMuted,
    isChannelBusy,
    requestStream,
    startRecording,
  ]);

  // Handle Spacebar Desktop Push-To-Talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (e.repeat) return;

      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      e.preventDefault();
      pressPTT();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      e.preventDefault();
      releasePTT();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [pressPTT, releasePTT]);

  // Handle iOS Interruption / Tab Blur / Visibility change
  useEffect(() => {
    const handleInterruption = () => {
      if (isHoldingRef.current) {
        releasePTT();
      }
    };

    window.addEventListener('blur', handleInterruption);
    window.addEventListener('pagehide', handleInterruption);
    document.addEventListener('visibilitychange', handleInterruption);

    return () => {
      window.removeEventListener('blur', handleInterruption);
      window.removeEventListener('pagehide', handleInterruption);
      document.removeEventListener('visibilitychange', handleInterruption);
    };
  }, [releasePTT]);

  return {
    pttState,
    isHolding: pttState === 'holding',
    isChannelBusy,
    activeSpeaker,
    audioLevel,
    transmissionElapsedMs,
    hasMicPermission: hasPermission,
    pressPTT,
    releasePTT,
  };
}
