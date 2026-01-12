import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { execCommand } from "./files.mjs";

const mimeToExtension = new Map([
  ["audio/webm", "webm"],
  ["audio/ogg", "ogg"],
  ["audio/mp4", "mp4"],
  ["audio/mpeg", "mp3"],
]);

const resolveInputExtension = ({ mimeType, originalName }) => {
  if (mimeType) {
    const baseMimeType = mimeType.split(";")[0]?.trim();
    if (mimeToExtension.has(baseMimeType)) {
      return mimeToExtension.get(baseMimeType);
    }
  }
  if (originalName) {
    const ext = path.extname(originalName).replace(".", "").toLowerCase();
    if (ext) {
      return ext;
    }
  }
  return "webm";
};

async function convertAudioToMp3({ audioData, mimeType, originalName }) {
  if (!audioData || audioData.length === 0) {
    throw new Error("Audio data is empty.");
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "koba-audio-"));
  const inputExtension = resolveInputExtension({ mimeType, originalName });
  const inputPath = path.join(dir, `input.${inputExtension}`);
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
