import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { execCommand } from "./files.mjs";

async function convertAudioToMp3({ audioData }) {
  if (!audioData || audioData.length === 0) {
    throw new Error("Audio data is empty.");
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "koba-audio-"));
  const inputPath = path.join(dir, "input.webm");
  const outputPath = path.join(dir, "output.mp3");
  await fs.writeFile(inputPath, audioData);
  try {
    await execCommand({ command: `ffmpeg -y -i "${inputPath}" "${outputPath}"` });
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export { convertAudioToMp3 };
