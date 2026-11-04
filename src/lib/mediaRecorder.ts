/**
 * MediaRecorder helper for cross-browser & iOS Safari audio recording.
 * Prioritizes audio/mp4 on iOS / WebKit, and audio/webm;codecs=opus on Chrome/Firefox.
 */

export function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return 'audio/webm';
  }

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');

  // Priority order for iOS
  const iosTypes = [
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
    'audio/webm;codecs=opus',
    'audio/webm',
  ];

  // Priority order for Chromium / Android / Desktop
  const standardTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac',
  ];

  const typesToTest = isIOS ? iosTypes : standardTypes;

  for (const type of typesToTest) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

export interface AudioRecordResult {
  blob: Blob;
  dataUrl: string;
  durationMs: number;
  mimeType: string;
}

export class WalkieRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private timerId: number | null = null;
  private stream: MediaStream | null = null;

  public async startRecording(stream: MediaStream, maxDurationMs: number = 60000): Promise<void> {
    this.recordedChunks = [];
    this.stream = stream;
    const mimeType = getSupportedMimeType();

    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    this.mediaRecorder = new MediaRecorder(stream, options);

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.startTime = Date.now();
    this.mediaRecorder.start(100); // 100ms slice for low-latency chunks

    // Safety timeout to enforce max 60s limit
    if (this.timerId) window.clearTimeout(this.timerId);
    this.timerId = window.setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
    }, maxDurationMs);
  }

  public async stopRecording(): Promise<AudioRecordResult | null> {
    if (this.timerId) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return null;
    }

    return new Promise((resolve) => {
      const mimeType = this.mediaRecorder?.mimeType || getSupportedMimeType() || 'audio/webm';
      const durationMs = Math.max(250, Date.now() - this.startTime);

      this.mediaRecorder!.onstop = async () => {
        const audioBlob = new Blob(this.recordedChunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve({
            blob: audioBlob,
            dataUrl,
            durationMs,
            mimeType,
          });
        };
        reader.onerror = () => {
          resolve({
            blob: audioBlob,
            dataUrl: URL.createObjectURL(audioBlob),
            durationMs,
            mimeType,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      try {
        this.mediaRecorder!.stop();
      } catch {
        resolve(null);
      }
    });
  }

  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
