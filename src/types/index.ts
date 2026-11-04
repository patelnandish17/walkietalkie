/**
 * Squawk - Walkie Talkie Types & Interfaces
 */

export type UserRole = 'owner' | 'member';

export type PresenceStatus = 'online' | 'away' | 'muted';

export interface UserProfile {
  id: string;
  email?: string;
  display_name: string;
  avatar_url: string;
  accent_color: string; // e.g. '#38bdf8', '#a855f7', '#ec4899', '#10b981'
  created_at?: string;
}

export interface Channel {
  id: string;
  name: string;
  emoji: string;
  invite_code: string;
  owner_id: string;
  frequency: string; // e.g. "462.5625 MHz" (tactile radio flavor)
  created_at: string;
  member_count?: number;
  last_activity_at?: string;
}

export interface ChannelMember {
  channel_id: string;
  user_id: string;
  role: UserRole;
  muted: boolean;
  joined_at: string;
  profile?: UserProfile;
  presence?: PresenceStatus;
  is_talking?: boolean;
}

export interface Transmission {
  id: string;
  channel_id: string;
  sender_id: string;
  audio_url: string; // Storage URL or data URL
  duration_ms: number;
  mime_type: string;
  created_at: string;
  sender?: UserProfile;
  listened_by_me?: boolean;
}

export interface TransmissionListen {
  transmission_id: string;
  user_id: string;
  listened_at: string;
}

export interface PresenceState {
  user_id: string;
  channel_id: string;
  status: PresenceStatus;
  is_talking: boolean;
  last_seen: string;
  profile?: UserProfile;
}

export type TabType = 'channels' | 'talk' | 'clips' | 'members' | 'profile';
