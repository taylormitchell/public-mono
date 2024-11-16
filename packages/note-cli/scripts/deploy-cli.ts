import fs from "fs";
import path from "path";
import os from "os";

const home = os.homedir();
const zprofilePath = path.join(home, ".zprofile");
const indexPath = path.resolve(__dirname, "cli.ts");
const aliasLine = `alias n="bun ${indexPath}"`;

try {
  let content = fs.readFileSync(zprofilePath, "utf8");
  if (content.includes("alias n=")) {
    // Replace existing alias
    content = content.replace(/^alias n=.*$/m, aliasLine);
  } else {
    // Add new alias at the end of the file
    content += "\n" + aliasLine;
  }
  fs.writeFileSync(zprofilePath, content);
  console.log("Alias added or updated in ~/.zprofile");
} catch (error) {
  console.error("Error updating alias:", error);
}
