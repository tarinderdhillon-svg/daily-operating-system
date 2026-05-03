import { Router } from "express";
import multer from "multer";
import { OpenAI, toFile } from "openai";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Map MIME type → file extension that Whisper accepts
function audioExt(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("mpeg")) return "mp4";
  if (mime.includes("ogg"))  return "ogg";
  if (mime.includes("wav"))  return "wav";
  if (mime.includes("webm")) return "webm";
  // iOS Safari often sends audio/aac or audio/x-m4a
  if (mime.includes("aac"))  return "mp4";
  return "webm"; // whisper's safest fallback
}

router.post("/", upload.single("audio"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No audio file provided" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ success: false, error: "OpenAI API key not configured" });
    return;
  }

  const client = new OpenAI({ apiKey });

  try {
    const mime = req.file.mimetype || "audio/webm";
    const ext  = audioExt(mime);

    req.log.info({ mime, ext, bytes: req.file.size }, "Transcribing audio");

    const audioFile = await toFile(req.file.buffer, `recording.${ext}`, { type: mime });

    const transcription = await client.audio.transcriptions.create({
      file:     audioFile,
      model:    "whisper-1",
      language: "en",
    });

    res.json({ success: true, text: transcription.text });
  } catch (err) {
    req.log.error({ err }, "Transcription failed");
    res.status(500).json({ success: false, error: "Transcription failed" });
  }
});

export default router;
