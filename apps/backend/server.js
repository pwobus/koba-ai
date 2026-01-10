import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { openAIChain, parser } from "./modules/openAI.mjs";
import { lipSync } from "./modules/lip-sync.mjs";
import { sendDefaultMessages, defaultResponse } from "./modules/defaultMessages.mjs";
import { convertAudioToText } from "./modules/whisper.mjs";

dotenv.config();

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;

const app = express();
app.use(express.json());
app.use(cors());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // Limit file size to 5MB
const port = 3000;


app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

app.post("/tts", async (req, res) => {
  const userMessage = await req.body.message;
  const defaultMessages = await sendDefaultMessages({ userMessage });
  if (defaultMessages) {
    res.send({ messages: defaultMessages });
    return;
  }
  let openAImessages;
  try {
    openAImessages = await openAIChain.invoke({
      question: userMessage,
      format_instructions: parser.getFormatInstructions(),
    });
  } catch (error) {
    openAImessages = { messages: defaultResponse };
  }
  openAImessages = await lipSync({ messages: openAImessages.messages });
  res.send({ messages: openAImessages });
});

app.post("/sts", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    res.status(400).send({ error: "Audio file is required." });
    return;
  }
  const audioData = req.file.buffer;
  const userMessage = await convertAudioToText({ audioData });
  let openAImessages;
  try {
    openAImessages = await openAIChain.invoke({
      question: userMessage,
      format_instructions: parser.getFormatInstructions(),
    });
  } catch (error) {
    openAImessages = { messages: defaultResponse };
  }
  openAImessages = await lipSync({ messages: openAImessages.messages });
  res.send({ messages: openAImessages });
});

app.listen(port, () => {
  console.log(`Jack are listening on port ${port}`);
});
