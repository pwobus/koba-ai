import { exec, execFile } from "child_process";
import { promises as fs } from "fs";

const execCommand = ({ command, args = [], cwd }) => {
  return new Promise((resolve, reject) => {
    if (Array.isArray(args) && args.length > 0) {
      execFile(command, args, { cwd }, (error, stdout, stderr) => {
        if (error) {
          error.stderr = stderr;
          reject(error);
          return;
        }
        resolve(stdout);
      });
      return;
    }

    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

const readJsonTranscript = async ({ fileName }) => {
  const data = await fs.readFile(fileName, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async ({ fileName }) => {
  const data = await fs.readFile(fileName);
  return data.toString("base64");
};

export { execCommand, readJsonTranscript, audioFileToBase64 };
