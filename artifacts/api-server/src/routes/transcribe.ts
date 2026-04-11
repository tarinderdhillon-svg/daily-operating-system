import { Router } from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

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

  // Use your own OpenAI key directly (not Replit integrations proxy)
  const client = new OpenAI({ apiKey });

  try {
    const ext = req.file.mimetype?.includes("ogg") ? "ogg" : "webm";
    const audioFile = await toFile(req.file.buffer, `recording.${ext}`, {
      type: req.file.mimetype || "audio/webm",
    });

    const transcription = await client.audio.transcriptions.create({
      file:     audioFile,
      model:    "whisper-1",   // only Whisper model available — already cheapest
      language: "en",
    });

    res.json({ success: true, text: transcription.text });
  } catch (err) {
    req.log.error({ err }, "Transcription failed");
    res.status(500).json({ success: false, error: "Transcription failed" });
  }
});

export default router;
