import path from "path";
import { execSync } from "child_process";

export function getRepoRoot() {
  return path.resolve(__dirname, "../../");
}

export function getRootDir() {
  return path.resolve(getRepoRoot(), "data");
}

export function saveFile(
  filepath: string,
  message?: string
):
  | {
      ok: true;
      stashed: boolean;
    }
  | {
      ok: false;
      error: string;
    } {
  try {
    message = message || `Save ${filepath}`;
    const outputs = [
      execSync(`cd ${getRootDir()}`).toString(),
      execSync(
        `git stash save "Stashing changes during data save $(date)" --include-untracked`
      ).toString(),
      execSync(`git pull`).toString(),
      execSync(`git add ${filepath}`).toString(),
      execSync(`git commit -m "${message}"`).toString(),
      execSync(`git push`).toString(),
    ];
    console.log("outputs:", outputs);
    const stashed = !outputs[1].includes("No local changes to save");
    const ok = execSync(`git pull`).toString().includes("Already up to date.");
    if (ok) {
      return { ok: true, stashed };
    } else {
      return { ok: false, error: outputs.join("\n") };
    }
  } catch (error) {
    console.log("error:", error);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
