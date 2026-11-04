# Squawk: Tactical Push-to-Talk Walkie-Talkie Web App & PWA

**Squawk** is a low-latency, tactile push-to-talk (PTT) walkie-talkie web app and installable Progressive Web App (PWA) designed for groups of friends. It brings the visceral, playful feel of hardware two-way radios to modern mobile and desktop browsers.

---

## 1. Architecture Overview

Squawk operates on a hybrid live-radio and asynchronous voice clip pipeline:

```
┌─────────────────────────────────────────────────────────────┐
│                       SQUAWK CLIENT                         │
│  • PTT State Machine (Spacebar, Pointer & Touch Events)     │
│  • WebAudio Squelch Engine (Key-up chirp, "Kshh" tail)      │
│  • AudioContext Unlock Gate (iOS Safari / Autoplay Policy)  │
│  • Audio Meter & Dynamic Peak Visualizer                    │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       [Live WebRTC Mode]             [Clip & Fallback Mode]
               │                               │
               ▼                               ▼
     ┌──────────────────┐           ┌──────────────────────┐
     │  LIVEKIT CLOUD   │           │   SUPABASE STORAGE   │
     │   WebRTC Audio   │           │ • Voice clips (.mp4/ │
     │  Channel Rooms   │           │   .webm opus)        │
     └──────────────────┘           │ • Post-stream arch.  │
               │                    └──────────┬───────────┘
               │                               │
               ▼                               ▼
     ┌─────────────────────────────────────────────────────┐
     │                SUPABASE POSTGRES DB                 │
     │  • profiles, channels, channel_members,             │
     │    transmissions, transmission_listens              │
     │  • Row-Level Security (RLS) & Realtime Presence     │
     └─────────────────────────────────────────────────────┘
```

- **Live Transmission (Online Peers)**: When LiveKit is connected, keying the PTT button calls `setMicrophoneEnabled(true)` in the active room. Audio streams to online peers with sub-200ms latency.
- **Asynchronous Storage (Offline Peers)**: While transmitting, the client simultaneously records using the browser's optimal codec (`audio/mp4` on iOS Safari, `audio/webm;codecs=opus` on Chromium/Firefox). When released, the clip archives to Supabase Storage and database for unheard playback.
- **Graceful Fallback Mode**: If LiveKit credentials are not yet configured, the system falls back to peer-to-peer / local broadcast mode so full end-to-end transmissions, squelch sounds, waveforms, and clip storage work out of the box.

---

## 2. Folder Tree

```
squawk/
├── public/
│   ├── icon.svg                      # Scalable SVG branding
│   ├── pwa-192x192.png               # PWA standard Android icon
│   ├── pwa-512x512.png               # PWA high-res Android icon
│   ├── pwa-maskable-512x512.png      # Android adaptive maskable icon
│   └── apple-touch-icon.png          # iOS Safari Home Screen touch icon
├── src/
│   ├── components/
│   │   ├── AudioUnlockGate.tsx       # iOS & Safari WebAudio first-gesture unlocker
│   │   ├── BackgroundMesh.tsx        # Ambient animated gradient blobs (Dark/Light)
│   │   ├── BottomTabBar.tsx          # Mobile-first 5-tab bar with 44px touch targets
│   │   ├── ChannelList.tsx           # Frequency channel list, tuning ticks, invite codes
│   │   ├── ClipHistory.tsx           # Voice clip feed, waveform scrubber & new badges
│   │   ├── CreateJoinModal.tsx       # Channel creation and 6-char code joining
│   │   ├── IOSPwaBanner.tsx          # iOS PWA notice & "Add to Home Screen" modal
│   │   ├── MemberList.tsx            # Realtime presence (Online/Away/Muted)
│   │   ├── MicExplainerModal.tsx     # Friendly privacy & microphone explainer
│   │   ├── ProfileSettingsModal.tsx  # Call sign, accent colors, audio sliders & cloud keys
│   │   ├── PTTButton.tsx             # The Hero glass orb PTT button with ripples
│   │   └── WhoIsTalking.tsx          # Live speaker badge with radiating avatar
│   ├── hooks/
│   │   ├── useAudioRecorder.ts       # MediaStream capture, analyser RMS & recorder
│   │   ├── usePresence.ts            # Member presence, mute and listening modes
│   │   ├── usePWAInstall.ts          # PWA installation and iOS Safari detection
│   │   └── usePushToTalk.ts          # Core PTT state machine, spacebar & audio squelch
│   ├── lib/
│   │   ├── audio.ts                  # WebAudio radio squelch ("kshh") sound engine
│   │   ├── haptics.ts                # Cross-platform haptic wrapper (vibrate + WebAudio)
│   │   ├── livekit.ts                # LiveKit WebRTC client manager & broadcast fallback
│   │   ├── mediaRecorder.ts          # iOS audio/mp4 and webm codec negotiator
│   │   └── supabase.ts               # Supabase client, local persistence & data store
│   ├── types/
│   │   └── index.ts                  # TypeScript models (Channels, Transmissions, etc.)
│   ├── App.tsx                       # Master App Router / coordinator
│   ├── index.css                     # Tailwind CSS v4, safe area insets, glass styling
│   └── main.tsx                      # Vite React 19 entry point
├── supabase/
│   └── migrations/
│       └── 20261104_init_squawk.sql  # Complete Postgres schema, RLS, indexes & storage
├── .env.example                      # Complete environment configuration template
├── index.html                        # Meta tags, iOS PWA status bar, Plus Jakarta Sans
├── metadata.json                     # AI Studio permissions & app definition
├── package.json
├── tsconfig.json
└── vite.config.ts                    # VitePWA plugin, asset precaching, dev sw
```

---

## 3. SQL Migration & Row Level Security

The complete database migration is located in `supabase/migrations/20261104_init_squawk.sql`.

Key tables and security:
- `profiles`: User call signs, avatars, and custom accent colors (`#38bdf8`, `#a855f7`, etc.).
- `channels`: Channels with 6-character unique invite codes (e.g., `SQW001`) and frequencies (`462.5625 MHz`).
- `channel_members`: Member associations with role (`owner` | `member`) and mute status.
- `transmissions`: Archival voice clips with `audio_path`, `duration_ms` (max 60s), and `mime_type` (`audio/mp4` or `audio/webm`).
- `transmission_listens`: Tracks which users have listened to each clip to drive the "NEW" badge.
- **Row Level Security (RLS)**: Enforces that users can only select and upload transmissions for channels of which they are active members via `is_channel_member()`.

---

## 4. Setup Steps

### A. Supabase
1. Create a new project on [Supabase](https://supabase.com).
2. Go to **SQL Editor** -> **New Query**, paste `supabase/migrations/20261104_init_squawk.sql`, and execute.
3. In **Storage**, verify the `voice_clips` bucket is created.
4. In **Project Settings** -> **API**, copy your `Project URL` and `anon public` key to `.env` (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).

### B. Google OAuth
1. In Supabase Dashboard, go to **Authentication** -> **Providers** -> **Google**.
2. Create an OAuth 2.0 Client ID in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
3. Set the Authorized Redirect URI to `https://<YOUR-SUPABASE-PROJECT-ID>.supabase.co/auth/v1/callback`.
4. Paste the Client ID and Secret into Supabase and enable Google sign-in.

### C. LiveKit (WebRTC Live Audio)
1. Create a free project on [LiveKit Cloud](https://livekit.io).
2. In Project Settings, copy the WebSocket URL (e.g. `wss://your-project.livekit.cloud`).
3. Set `VITE_LIVEKIT_URL` in your `.env` or paste it directly in Squawk's **Profile & Radio Settings** panel.
4. *Note: If no LiveKit keys are entered, Squawk automatically falls back to MediaRecorder broadcast clip mode.*

### D. Deploying on Vercel
1. Import your Git repository into Vercel.
2. Under **Environment Variables**, add the keys defined in `.env.example`.
3. Build command: `npm run build` (or `vite build`).
4. Output directory: `dist`.

---

## 5. iOS Compatibility Details & Test Target (iOS 16.4+ Safari and PWA)

- **AudioContext Unlock Gate**: Audio hardware is locked by default in iOS Safari. Squawk includes a "Tap to Start Radio" gate that executes on first user gesture, running a 1-sample silent WebAudio buffer to unlock the audio session.
- **MediaRecorder Codec Negotiation**: Automatically queries `MediaRecorder.isTypeSupported()`. Prefers `audio/mp4;codecs=mp4a.40.2` on iOS Safari, and `audio/webm;codecs=opus` on Chromium.
- **Haptic Feedback**: Wraps vibration in `triggerHaptic()`. On iOS (where `navigator.vibrate` is unavailable), it synthesizes a subtle 90Hz WebAudio click and visual pulse.
- **Touch Gesture Isolation**: The hero PTT button uses `touch-action: none; user-select: none; -webkit-touch-callout: none;` to prevent Safari text selection, long-press magnifying glasses, or callout sheets.
- **Interruption Handling**: Listens for `pagehide`, `blur`, and `visibilitychange` to release the PTT button if an incoming call or Siri interrupts.
- **PWA Status Bar**: Configured with `apple-mobile-web-app-status-bar-style: black-translucent`, `viewport-fit=cover`, and safe-area padding (`pb-safe`).

---

## 6. Known iOS Limitations & Migration Path to Expo (React Native)

### Known iOS Web Limitations
1. **Background Audio in Safari/PWA**: iOS WebKit suspends audio capture and playback approximately 10 to 30 seconds after the user leaves Safari or locks the screen, unless an active media session or call kit is running.
2. **Push Notifications**: Web Push requires iOS 16.4+ and requires the user to first "Add to Home Screen".

### Migration Path to Expo (React Native)
To enable true always-on background walkie-talkie audio, VoIP PushKit, and lock screen physical button support:
1. Initialize an Expo project: `npx create-expo-app squawk-native -t blank-typescript`.
2. Install LiveKit React Native SDK: `npx expo install @livekit/react-native react-native-webrtc`.
3. Install Audio Session: `npx expo install expo-av @livekit/react-native-audio-session`.
4. Enable `UIBackgroundModes`: `['audio', 'voip']` in `app.json`.
5. Connect to the existing Supabase Postgres & Storage database (`@supabase/supabase-js`) with identical database tables and RLS policies!

---

## 7. Assumptions & v2 Roadmap

### Assumptions
1. PTT operates on a half-duplex radio model: only one operator may transmit per channel at a time.
2. Max transmission length is capped at 60 seconds to conserve bandwidth and prevent open mic accidents.
3. For instant out-of-the-box evaluation without requiring third-party credentials, Squawk features an embedded local simulation engine with BroadcastChannel for seamless multi-tab testing.

### v2 Roadmap Ideas
- [ ] **Dual Watch / Priority Channel**: Listen to two channels simultaneously with auto-priority ducking.
- [ ] **Physical Volume Button PTT**: Mapping hardware volume buttons (via WebHID or React Native wrapper).
- [ ] **Transcription & Summary**: Server-side Whisper transcription of recorded voice clips with AI summaries.
- [ ] **Spatial Radio**: Audio panning based on member location or visual proximity.
- [ ] **Morse Code / Emergency SOS Alert**: High-priority alert tones broadcasted across all joined frequencies.
