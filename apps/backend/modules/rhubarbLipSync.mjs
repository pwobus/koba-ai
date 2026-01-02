import fs from "fs";
import path from "path";

import { execCommand } from "../utils/files.mjs";

const RHUBARB_PATH = process.env.RHUBARB_PATH || "./bin/rhubarb";

const getRhubarbBinaryPath = () => {
  const resolvedPath = path.resolve(RHUBARB_PATH);

  if (fs.existsSync(resolvedPath)) {
    return resolvedPath;
  }

  throw new Error(
    `Rhubarb Lip-Sync binary not found at "${resolvedPath}". ` +
      "Download the Rhubarb Lip-Sync release for your platform and place the executable in apps/backend/bin, " +
      "or set the RHUBARB_PATH environment variable to the binary location (see README)."
  );
};

const getPhonemes = async ({ message }) => {
  try {
    const time = new Date().getTime();
    console.log(`Starting conversion for message ${message}`);
    await execCommand(
      { command: `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav` }
      // -y to overwrite the file
    );
    console.log(`Conversion done in ${new Date().getTime() - time}ms`);
    await execCommand({
      command: `"${getRhubarbBinaryPath()}" -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`,
    });
    // -r phonetic is faster but less accurate
    console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
  } catch (error) {
    console.error(`Error while getting phonemes for message ${message}:`, error);
  }
};

export { getPhonemes };