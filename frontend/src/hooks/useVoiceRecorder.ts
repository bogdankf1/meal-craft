"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface UseVoiceRecorderOptions {
  /** Maximum recording duration in seconds (default: 120) */
  maxDurationSeconds?: number;
  /** Audio constraints for getUserMedia */
  audioConstraints?: MediaTrackConstraints;
  /** Callback when recording starts */
  onRecordingStart?: () => void;
  /** Callback when recording stops with the audio blob */
  onRecordingStop?: (blob: Blob) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseVoiceRecorderReturn {
  /** Whether currently recording */
  isRecording: boolean;
  /** Current recording duration in seconds */
  duration: number;
  /** The recorded audio blob (null if no recording) */
  audioBlob: Blob | null;
  /** URL for audio playback */
  audioUrl: string | null;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current audio level (0-100) for visualization */
  audioLevel: number;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording */
  stopRecording: () => void;
  /** Clear the current recording */
  clearRecording: () => void;
  /** Toggle audio playback */
  togglePlayback: () => void;
  /** Format duration as MM:SS */
  formatDuration: (seconds: number) => string;
}

/**
 * Hook for recording audio with level monitoring and playback support.
 * Handles browser compatibility and provides visual feedback.
 */
export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {}
): UseVoiceRecorderReturn {
  const {
    maxDurationSeconds = 120,
    audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    onRecordingStart,
    onRecordingStop,
    onError,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioUrl]);

  // Initialize audio element for playback
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsPlaying(false);
    return () => {
      audioRef.current = null;
    };
  }, []);

  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 128) * 100);
        setAudioLevel(normalizedLevel);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.error("[useVoiceRecorder] Failed to start audio level monitoring:", e);
    }
  }, []);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      }

      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      streamRef.current = stream;
      startAudioLevelMonitoring(stream);

      // Check which formats are supported
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];

      let selectedMimeType = "";
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        selectedMimeType = "audio/webm";
      }

      mimeTypeRef.current = selectedMimeType;

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: selectedMimeType,
        });
      } catch {
        mediaRecorder = new MediaRecorder(stream);
        mimeTypeRef.current = mediaRecorder.mimeType || "audio/webm";
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopAudioLevelMonitoring();

        const mimeType = mimeTypeRef.current;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        onRecordingStop?.(blob);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setDuration(0);
      onRecordingStart?.();

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDurationSeconds) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("[useVoiceRecorder] Failed to start recording:", error);
      onError?.("Failed to access microphone");
    }
  }, [
    audioConstraints,
    maxDurationSeconds,
    startAudioLevelMonitoring,
    stopAudioLevelMonitoring,
    stopRecording,
    onRecordingStart,
    onRecordingStop,
    onError,
  ]);

  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
  }, [audioUrl]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    audioRef.current.src = audioUrl;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [audioUrl, isPlaying]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    isPlaying,
    audioLevel,
    startRecording,
    stopRecording,
    clearRecording,
    togglePlayback,
    formatDuration,
  };
}
