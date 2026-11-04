/**
 * Hook for microphone access, real-time audio analysis, and recording
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { WalkieRecorder, AudioRecordResult } from '../lib/mediaRecorder';

export function useAudioRecorder() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0.0 to 1.0 for visualizer
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recorderRef = useRef<WalkieRecorder>(new WalkieRecorder());

  // Check initial permission query if supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          if (status.state === 'granted') setHasPermission(true);
          else if (status.state === 'denied') setHasPermission(false);
          status.onchange = () => {
            setHasPermission(status.state === 'granted');
          };
        })
        .catch(() => {
          // Some browsers throw on microphone query
        });
    }
  }, []);

  // Request or get mic stream
  const requestStream = useCallback(async (): Promise<MediaStream | null> => {
    if (streamRef.current && streamRef.current.active) {
      return streamRef.current;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      streamRef.current = stream;
      setHasPermission(true);

      // Setup WebAudio analyser for live waveform
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      return stream;
    } catch (err) {
      console.warn('Microphone permission request failed:', err);
      setHasPermission(false);
      return null;
    }
  }, []);

  // Real-time audio meter animation loop
  const startMetering = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1, avg / 128); // 0 to 1
      setAudioLevel(normalized);

      animFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, []);

  const stopMetering = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Start recording transmission
  const startRecording = useCallback(async (): Promise<boolean> => {
    const stream = await requestStream();
    if (!stream) return false;

    try {
      await recorderRef.current.startRecording(stream, 60000);
      setIsRecording(true);
      startMetering();
      return true;
    } catch (e) {
      console.warn('Failed to start recording:', e);
      return false;
    }
  }, [requestStream, startMetering]);

  // Stop recording and retrieve audio result
  const stopRecording = useCallback(async (): Promise<AudioRecordResult | null> => {
    stopMetering();
    setIsRecording(false);
    try {
      const result = await recorderRef.current.stopRecording();
      return result;
    } catch (e) {
      console.warn('Failed to stop recording:', e);
      return null;
    }
  }, [stopMetering]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMetering();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stopMetering]);

  return {
    hasPermission,
    isRecording,
    audioLevel,
    requestStream,
    startRecording,
    stopRecording,
  };
}
