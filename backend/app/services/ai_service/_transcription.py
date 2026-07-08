"""TranscriptionMixin: AI Service for MealCraft mixins"""

class TranscriptionMixin:
    async def transcribe_audio(self, audio_file, language: str = "auto") -> str:
        """
        Transcribe audio to text using OpenAI Whisper API

        Args:
            audio_file: Audio file object (from FastAPI UploadFile)
            language: Language code (e.g., "en", "uk", "ru") or "auto" for auto-detect

        Returns:
            Transcribed text
        """
        try:
            print(f"[AI Service] Transcribing audio, language: {language}")

            # Prepare language parameter (None for auto-detect)
            lang_param = None if language == "auto" else language

            response = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=lang_param,
            )

            transcribed_text = response.text.strip()
            print(f"[AI Service] Transcribed text: {transcribed_text[:200]}...")

            return transcribed_text

        except Exception as e:
            print(f"[AI Service] Transcription error: {e}")
            raise
