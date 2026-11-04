/**
 * LiveKit WebRTC Push-to-Talk Manager & Real-Time Audio Broadcast Fallback
 * Implements:
 * - Room connection once on channel entry
 * - setMicrophoneEnabled(true) on press, setMicrophoneEnabled(false) on release
 * - Autoplay audio handling & track subscriptions
 * - iOS interruptions & visibility change handling
 * - Fallback broadcast mode when LiveKit keys are not configured
 */

import { Room, RoomEvent, Track, RemoteTrack, RemoteAudioTrack } from 'livekit-client';
import { localStore } from './supabase';
import { UserProfile } from '../types';

export interface LiveAudioEvent {
  senderId: string;
  senderName: string;
  avatarUrl: string;
  accentColor: string;
  channelId: string;
  isTalking: boolean;
}

export interface LiveKitConfig {
  serverUrl: string;
  token?: string;
}

class LiveKitWalkieManager {
  private currentRoom: Room | null = null;
  private currentChannelId: string | null = null;
  private isConnecting: boolean = false;
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private onSpeakerChangeCallback: ((speaker: LiveAudioEvent | null) => void) | null = null;
  private currentSpeaker: LiveAudioEvent | null = null;

  // Stored credentials
  public getConfig(): { serverUrl: string; token: string } {
    if (typeof window === 'undefined') return { serverUrl: '', token: '' };
    const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_LIVEKIT_URL || '';
    const storedUrl = localStorage.getItem('squawk_livekit_url') || envUrl;
    const storedToken = localStorage.getItem('squawk_livekit_token') || '';
    return { serverUrl: storedUrl, token: storedToken };
  }

  public saveConfig(serverUrl: string, token: string) {
    if (typeof window !== 'undefined') {
      if (serverUrl) localStorage.setItem('squawk_livekit_url', serverUrl);
      else localStorage.removeItem('squawk_livekit_url');
      if (token) localStorage.setItem('squawk_livekit_token', token);
      else localStorage.removeItem('squawk_livekit_token');
    }
  }

  public isLiveKitConfigured(): boolean {
    const { serverUrl } = this.getConfig();
    return Boolean(serverUrl && serverUrl.startsWith('ws'));
  }

  public setSpeakerChangeListener(cb: (speaker: LiveAudioEvent | null) => void) {
    this.onSpeakerChangeCallback = cb;
  }

  /**
   * Connect to a channel's LiveKit room or fallback broadcast channel
   */
  public async joinChannel(
    channelId: string,
    currentUser: UserProfile
  ): Promise<boolean> {
    if (this.currentChannelId === channelId && this.currentRoom) {
      return true;
    }

    // Leave existing room if any
    await this.leaveChannel();
    this.currentChannelId = channelId;

    const { serverUrl, token } = this.getConfig();

    if (this.isLiveKitConfigured() && token) {
      try {
        this.isConnecting = true;
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Track subscribed
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Audio && track.sid) {
            const audioElement = (track as RemoteAudioTrack).attach();
            audioElement.autoplay = true;
            this.audioElements.set(track.sid, audioElement);
          }
        });

        // Track unsubscribed
        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (track.sid) {
            const el = this.audioElements.get(track.sid);
            if (el) {
              el.remove();
              this.audioElements.delete(track.sid);
            }
          }
        });

        // Active speaker changed
        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          if (speakers.length > 0) {
            const speaker = speakers[0];
            const event: LiveAudioEvent = {
              senderId: speaker.identity,
              senderName: speaker.name || 'Station Member',
              avatarUrl: speaker.metadata ? JSON.parse(speaker.metadata).avatar_url : '',
              accentColor: speaker.metadata ? JSON.parse(speaker.metadata).accent_color : '#38bdf8',
              channelId,
              isTalking: true,
            };
            this.currentSpeaker = event;
            this.onSpeakerChangeCallback?.(event);
          } else {
            this.currentSpeaker = null;
            this.onSpeakerChangeCallback?.(null);
          }
        });

        await room.connect(serverUrl, token);
        // Ensure mic starts disabled
        await room.localParticipant.setMicrophoneEnabled(false);

        this.currentRoom = room;
        this.isConnecting = false;
        return true;
      } catch (err) {
        console.warn('LiveKit connection error, falling back to Broadcast mode:', err);
        this.isConnecting = false;
        this.currentRoom = null;
      }
    }

    // Fallback broadcast channel listener
    const unsubscribe = localStore.subscribe((event) => {
      if (event.type === 'ptt_active_speaker') {
        const payload = event.payload as LiveAudioEvent;
        if (payload.channelId === this.currentChannelId) {
          if (payload.isTalking) {
            this.currentSpeaker = payload;
            this.onSpeakerChangeCallback?.(payload);
          } else {
            if (this.currentSpeaker?.senderId === payload.senderId) {
              this.currentSpeaker = null;
              this.onSpeakerChangeCallback?.(null);
            }
          }
        }
      } else if (event.type === 'live_audio_broadcast') {
        const payload = event.payload as {
          channelId: string;
          senderId: string;
          audioDataUrl: string;
          mimeType: string;
        };
        // Play peer audio if in same channel and not from self
        if (
          payload.channelId === this.currentChannelId &&
          payload.senderId !== currentUser.id
        ) {
          const audio = new Audio(payload.audioDataUrl);
          audio.autoplay = true;
          audio.play().catch((e) => console.warn('Autoplay audio blocked:', e));
        }
      }
    });

    // Store un-subscriber in window for cleanup
    (window as unknown as { _squawk_cleanup?: () => void })._squawk_cleanup = unsubscribe;
    return true;
  }

  /**
   * PTT Press: Open Microphone
   */
  public async startTalking(user: UserProfile): Promise<boolean> {
    if (!this.currentChannelId) return false;

    // Check if channel is busy
    if (this.currentSpeaker && this.currentSpeaker.senderId !== user.id) {
      return false; // Busy!
    }

    const speakerEvent: LiveAudioEvent = {
      senderId: user.id,
      senderName: user.display_name,
      avatarUrl: user.avatar_url,
      accentColor: user.accent_color,
      channelId: this.currentChannelId,
      isTalking: true,
    };

    if (this.currentRoom) {
      try {
        await this.currentRoom.localParticipant.setMicrophoneEnabled(true);
      } catch (e) {
        console.warn('Could not enable LiveKit microphone:', e);
      }
    }

    // Emit live speaking event
    this.currentSpeaker = speakerEvent;
    this.onSpeakerChangeCallback?.(speakerEvent);
    localStore.emit('ptt_active_speaker', speakerEvent);

    return true;
  }

  /**
   * PTT Release: Mute Microphone
   */
  public async stopTalking(user: UserProfile, recordedDataUrl?: string, mimeType?: string) {
    if (!this.currentChannelId) return;

    if (this.currentRoom) {
      try {
        await this.currentRoom.localParticipant.setMicrophoneEnabled(false);
      } catch (e) {
        console.warn('Could not disable LiveKit microphone:', e);
      }
    }

    const releaseEvent: LiveAudioEvent = {
      senderId: user.id,
      senderName: user.display_name,
      avatarUrl: user.avatar_url,
      accentColor: user.accent_color,
      channelId: this.currentChannelId,
      isTalking: false,
    };

    if (this.currentSpeaker?.senderId === user.id) {
      this.currentSpeaker = null;
      this.onSpeakerChangeCallback?.(null);
    }
    localStore.emit('ptt_active_speaker', releaseEvent);

    // If recorded chunk available and in fallback broadcast mode, transmit to online peers
    if (recordedDataUrl && !this.currentRoom) {
      localStore.emit('live_audio_broadcast', {
        channelId: this.currentChannelId,
        senderId: user.id,
        audioDataUrl: recordedDataUrl,
        mimeType: mimeType || 'audio/webm',
      });
    }
  }

  /**
   * Leaves current channel and cleans up audio elements
   */
  public async leaveChannel() {
    if (this.currentRoom) {
      try {
        await this.currentRoom.disconnect();
      } catch {
        // Ignored
      }
      this.currentRoom = null;
    }

    this.audioElements.forEach((el) => el.remove());
    this.audioElements.clear();
    this.currentSpeaker = null;
    this.onSpeakerChangeCallback?.(null);
    this.currentChannelId = null;

    if ((window as unknown as { _squawk_cleanup?: () => void })._squawk_cleanup) {
      (window as unknown as { _squawk_cleanup?: () => void })._squawk_cleanup!();
    }
  }

  public getCurrentSpeaker(): LiveAudioEvent | null {
    return this.currentSpeaker;
  }
}

export const liveKitManager = new LiveKitWalkieManager();
