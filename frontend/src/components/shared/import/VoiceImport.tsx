"use client";

import { useTranslations } from "next-intl";
import { Mic, Square, Loader2, Sparkles, Play, Pause, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useImportWizard, ParsedItem } from "./ImportWizard";

interface VoiceImportProps<T extends ParsedItem> {
  onTranscribeAndParse: (audioBlob: Blob) => Promise<T[]>;
  maxDurationSeconds?: number;
}

export function VoiceImport<T extends ParsedItem>({
  onTranscribeAndParse,
  maxDurationSeconds = 120,
}: VoiceImportProps<T>) {
  const t = useTranslations("import");
  const { setParsedItems, setStep, isProcessing, setIsProcessing } =
    useImportWizard<T>();

  const {
    isRecording,
    duration,
    audioBlob,
    isPlaying,
    audioLevel,
    startRecording,
    stopRecording,
    clearRecording,
    togglePlayback,
    formatDuration,
  } = useVoiceRecorder({
    maxDurationSeconds,
  });

  const handleProcess = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      const items = await onTranscribeAndParse(audioBlob);
      setParsedItems(items);
      setStep("review");
    } catch (error) {
      console.error("Failed to process audio:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          {t("voice.title")}
        </CardTitle>
        <CardDescription>{t("voice.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recording controls */}
        <div className="flex flex-col items-center space-y-4">
          {!audioBlob ? (
            <>
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                className="h-20 w-20 rounded-full"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <Square className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>

              {isRecording && (
                <div className="text-center space-y-2 w-full max-w-xs">
                  <div className="flex items-center justify-center gap-2">
                    <span className="animate-pulse text-red-500">●</span>
                    <span className="font-mono text-lg">
                      {formatDuration(duration)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      / {formatDuration(maxDurationSeconds)}
                    </span>
                  </div>
                  <Progress
                    value={(duration / maxDurationSeconds) * 100}
                    className="h-2"
                  />
                  {/* Audio level indicator */}
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      Audio Level {audioLevel < 5 ? "(no audio detected!)" : ""}
                    </p>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-75 ${
                          audioLevel > 50
                            ? "bg-green-500"
                            : audioLevel > 20
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${audioLevel}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {isRecording ? t("voice.recording") : t("voice.tapToRecord")}
              </p>
            </>
          ) : (
            <>
              {/* Playback controls */}
              <div className="flex items-center gap-4">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-12 w-12 rounded-full"
                  onClick={togglePlayback}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                <div className="text-center">
                  <p className="font-mono">{formatDuration(duration)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("voice.recorded")}
                  </p>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={clearRecording}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Process button */}
        {audioBlob && (
          <div className="flex justify-center">
            <Button onClick={handleProcess} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("voice.processing")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t("voice.transcribeAndParse")}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Language hints */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-2">{t("voice.hints.title")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>{t("voice.hints.hint1")}</li>
            <li>{t("voice.hints.hint2")}</li>
            <li>{t("voice.hints.hint3")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
