import { convertTextToSpeech } from "./elevenLabs.mjs";
import { getPhonemes } from "./rhubarbLipSync.mjs";
import { readJsonTranscript, audioFileToBase64 } from "../utils/files.mjs";
import { promises as fs } from "fs";

const MAX_RETRIES = 5;
const RETRY_DELAY = 500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const lipSync = async ({ messages } = {}) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return Array.isArray(messages) ? messages : [];
  }

  const ttsResults = await Promise.all(
    messages.map(async (message, index) => {
      const fileName = `audios/message_${index}.mp3`;
      await fs.rm(fileName, { force: true });

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await convertTextToSpeech({ text: message.text, fileName });
          console.log(`Message ${index} converted to speech`);
          return { index, fileName, success: true };
        } catch (error) {
          const status = error?.response?.status;
          const shouldRetry = status === 429 && attempt < MAX_RETRIES - 1;
          if (shouldRetry) {
            await delay(RETRY_DELAY * Math.pow(2, attempt));
            continue;
          }
          console.warn(`Failed to convert message ${index} to speech.`, error);
          message.audio = null;
          message.lipsync = null;
          return { index, fileName, success: false };
        }
      }

      return { index, fileName, success: false };
    })
  );

  await Promise.all(
    ttsResults
      .filter((result) => result.success)
      .map(async ({ index, fileName }) => {
        const message = messages[index];

        try {
          await getPhonemes({ message: index });
          message.audio = await audioFileToBase64({ fileName });
          message.lipsync = await readJsonTranscript({ fileName: `audios/message_${index}.json` });
        } catch (error) {
          console.error(`Error while getting phonemes for message ${index}:`, error);
        }
      })
  );

  return messages;
};

export { lipSync };
