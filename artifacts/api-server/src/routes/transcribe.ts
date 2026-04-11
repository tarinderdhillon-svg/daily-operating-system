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

  const client = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });

  try {
    const audioFile = await toFile(req.file.buffer, "recording.webm", {
      type: req.file.mimetype || "audio/webm",
    });

    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });

    res.json({ success: true, text: transcription.text });
  } catch (err) {
    req.log.error({ err }, "Transcription failed");
    res.status(500).json({ success: false, error: "Transcription failed" });
  }
});

export default router;
