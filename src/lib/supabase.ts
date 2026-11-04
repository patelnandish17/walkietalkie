/**
 * Supabase Real Data & Realtime Integration Layer
 * Direct integration with Supabase Postgres, Auth, Storage, and Realtime.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Channel, ChannelMember, Transmission, UserProfile } from '../types';

// Retrieve credentials from Vite env or local storage
const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
const envKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';

export function getSupabaseCredentials(): { url: string; key: string } {
  if (typeof window === 'undefined') return { url: envUrl, key: envKey };
  const storedUrl = localStorage.getItem('squawk_supabase_url');
  const storedKey = localStorage.getItem('squawk_supabase_key');
  return {
    url: storedUrl || envUrl,
    key: storedKey || envKey,
  };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
}

// -------------------------------------------------------------
// Real Supabase Authentication
// -------------------------------------------------------------
export async function signInWithGoogle() {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: new Error('Supabase URL & Anon Key are required in your environment (.env).') };
  }
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
}

export async function signOutSupabase() {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
}

export async function getCurrentSupabaseUser(): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profile) {
      return {
        id: profile.id,
        email: session.user.email,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        accent_color: profile.accent_color || '#38bdf8',
        created_at: profile.created_at,
      };
    }

    // Auto-upsert profile if trigger didn't fire
    const newProfile: UserProfile = {
      id: session.user.id,
      email: session.user.email,
      display_name:
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split('@')[0] ||
        'Radio Operator',
      avatar_url:
        session.user.user_metadata?.avatar_url ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      accent_color: '#38bdf8',
    };

    await supabase.from('profiles').upsert({
      id: newProfile.id,
      display_name: newProfile.display_name,
      avatar_url: newProfile.avatar_url,
      accent_color: newProfile.accent_color,
    });

    return newProfile;
  } catch (err) {
    console.warn('Error fetching Supabase user:', err);
    return null;
  }
}

export async function updateUserProfile(profile: UserProfile): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          accent_color: profile.accent_color,
        })
        .eq('id', profile.id);
      return true;
    } catch (e) {
      console.warn('Failed to update profile on Supabase:', e);
    }
  }
  localStore.saveProfile(profile);
  return true;
}

// -------------------------------------------------------------
// Real Supabase Channels
// -------------------------------------------------------------
export async function fetchChannels(userId?: string): Promise<Channel[]> {
  const supabase = getSupabase();
  if (supabase && userId) {
    try {
      // Query channels where user is a member or owner
      const { data, error } = await supabase
        .from('channels')
        .select(`
          id,
          name,
          emoji,
          invite_code,
          owner_id,
          created_at,
          channel_members (user_id)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((ch, idx) => ({
          id: ch.id,
          name: ch.name,
          emoji: ch.emoji || '📻',
          invite_code: ch.invite_code,
          owner_id: ch.owner_id,
          frequency: `462.${5500 + (idx + 1) * 25} MHz (CH ${idx + 1})`,
          created_at: ch.created_at,
          member_count: Array.isArray(ch.channel_members) ? ch.channel_members.length : 1,
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch channels from Supabase:', e);
    }
  }
  return localStore.getChannels();
}

export async function createChannel(name: string, emoji: string, user: UserProfile): Promise<Channel | null> {
  const supabase = getSupabase();
  const inviteCode = 'SQW' + Math.floor(100 + Math.random() * 900);

  if (supabase) {
    try {
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name,
          emoji,
          invite_code: inviteCode,
          owner_id: user.id,
        })
        .select()
        .single();

      if (!error && channel) {
        // Automatically add owner to channel_members
        await supabase.from('channel_members').insert({
          channel_id: channel.id,
          user_id: user.id,
          role: 'owner',
          muted: false,
        });

        const newChan: Channel = {
          id: channel.id,
          name: channel.name,
          emoji: channel.emoji,
          invite_code: channel.invite_code,
          owner_id: channel.owner_id,
          frequency: `462.5625 MHz (CH 1)`,
          created_at: channel.created_at,
          member_count: 1,
        };
        localStore.saveChannel(newChan);
        return newChan;
      }
    } catch (e) {
      console.warn('Failed to insert channel in Supabase:', e);
    }
  }

  // Local fallback
  const fallbackChan: Channel = {
    id: `chan_${Date.now()}`,
    name,
    emoji,
    invite_code: inviteCode,
    owner_id: user.id,
    frequency: `462.5625 MHz (CH 1)`,
    created_at: new Date().toISOString(),
    member_count: 1,
  };
  localStore.saveChannel(fallbackChan);
  return fallbackChan;
}

export async function joinChannelByCode(code: string, user: UserProfile): Promise<Channel | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: channel, error } = await supabase
        .from('channels')
        .select('*')
        .eq('invite_code', code.toUpperCase())
        .maybeSingle();

      if (!error && channel) {
        // Insert membership
        await supabase
          .from('channel_members')
          .upsert({
            channel_id: channel.id,
            user_id: user.id,
            role: 'member',
            muted: false,
          });

        const joined: Channel = {
          id: channel.id,
          name: channel.name,
          emoji: channel.emoji,
          invite_code: channel.invite_code,
          owner_id: channel.owner_id,
          frequency: `462.5625 MHz (CH 1)`,
          created_at: channel.created_at,
          member_count: 2,
        };
        localStore.saveChannel(joined);
        return joined;
      }
    } catch (e) {
      console.warn('Failed to join channel on Supabase:', e);
    }
  }

  const local = localStore.getChannels().find((c) => c.invite_code.toUpperCase() === code.toUpperCase());
  return local || null;
}

// -------------------------------------------------------------
// Real Supabase Transmissions & Storage
// -------------------------------------------------------------
export async function uploadVoiceClip(
  channelId: string,
  user: UserProfile,
  audioBlob: Blob,
  durationMs: number,
  mimeType: string,
  fallbackDataUrl: string
): Promise<Transmission> {
  const supabase = getSupabase();
  let audioUrl = fallbackDataUrl;

  if (supabase) {
    try {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const filePath = `${channelId}/${Date.now()}_${user.id.substring(0, 6)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('voice_clips')
        .upload(filePath, audioBlob, {
          contentType: mimeType,
          upsert: true,
        });

      if (!uploadErr) {
        const { data: pubUrl } = supabase.storage
          .from('voice_clips')
          .getPublicUrl(filePath);
        if (pubUrl?.publicUrl) {
          audioUrl = pubUrl.publicUrl;
        }
      }

      // Record transmission in database
      const { data: row } = await supabase
        .from('transmissions')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          audio_path: audioUrl,
          duration_ms: Math.min(60000, durationMs),
          mime_type: mimeType,
        })
        .select()
        .single();

      if (row) {
        const trans: Transmission = {
          id: row.id,
          channel_id: row.channel_id,
          sender_id: row.sender_id,
          audio_url: row.audio_path,
          duration_ms: row.duration_ms,
          mime_type: row.mime_type,
          created_at: row.created_at,
          sender: user,
          listened_by_me: true,
        };
        localStore.saveTransmission(trans);
        return trans;
      }
    } catch (e) {
      console.warn('Supabase transmission upload error:', e);
    }
  }

  const fallbackTrans: Transmission = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    channel_id: channelId,
    sender_id: user.id,
    audio_url: fallbackDataUrl,
    duration_ms: durationMs,
    mime_type: mimeType,
    created_at: new Date().toISOString(),
    sender: user,
    listened_by_me: true,
  };
  localStore.saveTransmission(fallbackTrans);
  return fallbackTrans;
}

export async function fetchTransmissions(channelId: string): Promise<Transmission[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('transmissions')
        .select(`
          id,
          channel_id,
          sender_id,
          audio_path,
          duration_ms,
          mime_type,
          created_at,
          profiles (id, display_name, avatar_url, accent_color)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(40);

      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          channel_id: d.channel_id,
          sender_id: d.sender_id,
          audio_url: d.audio_path,
          duration_ms: d.duration_ms,
          mime_type: d.mime_type,
          created_at: d.created_at,
          sender: d.profiles ? {
            id: d.profiles.id,
            display_name: d.profiles.display_name,
            avatar_url: d.profiles.avatar_url,
            accent_color: d.profiles.accent_color,
          } : undefined,
          listened_by_me: true,
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch transmissions from Supabase:', e);
    }
  }
  return localStore.getTransmissions(channelId);
}

// -------------------------------------------------------------
// Clean Local Store (Zero Mock Junk)
// -------------------------------------------------------------
class CleanLocalStore {
  private broadcast: BroadcastChannel | null = null;
  private listeners: Set<(event: { type: string; payload: unknown }) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcast = new BroadcastChannel('squawk_realtime_bus');
      this.broadcast.onmessage = (e) => {
        this.listeners.forEach((cb) => cb(e.data));
      };
    }
  }

  public subscribe(cb: (event: { type: string; payload: unknown }) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public emit(type: string, payload: unknown) {
    if (this.broadcast) {
      this.broadcast.postMessage({ type, payload });
    }
    this.listeners.forEach((cb) => cb({ type, payload }));
  }

  public getProfiles(): UserProfile[] {
    const data = localStorage.getItem('squawk_profiles');
    return data ? JSON.parse(data) : [];
  }

  public saveProfile(profile: UserProfile) {
    const list = this.getProfiles();
    const idx = list.findIndex((p) => p.id === profile.id);
    if (idx >= 0) list[idx] = profile;
    else list.push(profile);
    localStorage.setItem('squawk_profiles', JSON.stringify(list));
    this.emit('profile_updated', profile);
  }

  public getChannels(): Channel[] {
    const data = localStorage.getItem('squawk_channels');
    return data ? JSON.parse(data) : [];
  }

  public saveChannel(channel: Channel) {
    const list = this.getChannels();
    const existing = list.findIndex((c) => c.id === channel.id);
    if (existing >= 0) list[existing] = channel;
    else list.unshift(channel);
    localStorage.setItem('squawk_channels', JSON.stringify(list));
    this.emit('channel_created', channel);
  }

  public getTransmissions(channelId: string): Transmission[] {
    const data = localStorage.getItem(`squawk_trans_${channelId}`);
    return data ? JSON.parse(data) : [];
  }

  public saveTransmission(trans: Transmission) {
    const list = this.getTransmissions(trans.channel_id);
    list.unshift(trans);
    const trimmed = list.slice(0, 50);
    localStorage.setItem(`squawk_trans_${trans.channel_id}`, JSON.stringify(trimmed));
    this.emit('transmission_new', trans);
  }

  public markListened(transId: string, channelId: string) {
    const list = this.getTransmissions(channelId);
    const item = list.find((t) => t.id === transId);
    if (item) {
      item.listened_by_me = true;
      localStorage.setItem(`squawk_trans_${channelId}`, JSON.stringify(list));
      this.emit('transmission_listened', { transId, channelId });
    }
  }

  public clearMockData() {
    localStorage.removeItem('squawk_profiles');
    localStorage.removeItem('squawk_channels');
  }
}

export const localStore = new CleanLocalStore();
