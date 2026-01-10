import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

import { execCommand } from "../utils/files.mjs";

const RHUBARB_PATH = process.env.RHUBARB_PATH;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
const audiosDir = path.join(backendRoot, "audios");
const defaultBinaryName = process.platform === "win32" ? "rhubarb.exe" : "rhubarb";
const defaultBinaryPath = path.join(__dirname, "..", "bin", defaultBinaryName);

const getSystemRhubarbPath = () => {
  const isWindows = process.platform === "win32";
  const command = isWindows ? "where" : "which";
  const binaryName = isWindows ? `${defaultBinaryName}` : "rhubarb";
  const { status, stdout } = spawnSync(command, [binaryName], { encoding: "utf8" });

  if (status === 0) {
    const resolved = stdout.trim();

    if (resolved) {
      return resolved;
    }
  }

  return null;
};

const isExecutable = (filePath) => {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch (error) {
    return false;
  }
};

const getRhubarbBinaryPath = () => {
  const candidates = [RHUBARB_PATH && path.resolve(RHUBARB_PATH), defaultBinaryPath, getSystemRhubarbPath()].filter(
    Boolean
  );

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && isExecutable(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Rhubarb Lip-Sync binary not found or not executable. Looked in: ${candidates.join(", ")}. ` +
      "Download the Rhubarb Lip-Sync release for your platform, place the executable in apps/backend/bin (make sure it is marked as executable), " +
      "install it globally so it's available on your PATH, or set the RHUBARB_PATH environment variable to the binary location (see README)."
  );
};

const getRhubarbBinaryDetails = () => {
  const binaryPath = getRhubarbBinaryPath();

  return {
    binaryPath,
    workingDirectory: path.dirname(binaryPath),
  };
};

const validateRhubarbResources = (workingDirectory) => {
  const expectedTmatPath = path.join(workingDirectory, "pocketsphinx", "model", "en-us", "en-us", "tmat");

  if (!fs.existsSync(expectedTmatPath)) {
    throw new Error(
      `Rhubarb Lip-Sync resources not found at ${expectedTmatPath}. ` +
        "Download and extract the full Rhubarb Lip-Sync release (including the pocketsphinx folder) into apps/backend/bin or " +
        "point RHUBARB_PATH to a directory that includes those resources."
    );
  }
};

const getPhonemes = async ({ message }) => {
  try {
    const time = new Date().getTime();
    const mp3Path = path.join(audiosDir, `message_${message}.mp3`);
    const wavPath = path.join(audiosDir, `message_${message}.wav`);
    const jsonPath = path.join(audiosDir, `message_${message}.json`);
    console.log(`Starting conversion for message ${message}`);
    await execCommand(
      { command: `ffmpeg -y -i "${mp3Path}" "${wavPath}"` }
      // -y to overwrite the file
    );
    console.log(`Conversion done in ${new Date().getTime() - time}ms`);
    const { binaryPath, workingDirectory } = getRhubarbBinaryDetails();
    validateRhubarbResources(workingDirectory);

    await execCommand({
      command: `"${binaryPath}" -f json -o "${jsonPath}" "${wavPath}" -r phonetic`,
      cwd: workingDirectory,
    });
    // -r phonetic is faster but less accurate
    console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
  } catch (error) {
    const permissionHints =
      error?.code === 126 || error?.code === "EACCES"
        ?
            " The Rhubarb binary may not have execute permissions for this user, or it may be built for a different platform. " +
          "Verify the binary matches your system architecture and run 'chmod +x <rhubarb-path>' (avoiding directories mounted with the noexec flag)."
        : "";

    console.error(`Error while getting phonemes for message ${message}:${permissionHints}`, error);
  }
};

export { getPhonemes };
