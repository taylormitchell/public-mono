import fs from "fs";
import path from "path";
import { glob } from "glob";

// find root dir by walking up until we find a package.json
let root = __dirname;
while (!fs.existsSync(path.join(root, "package.json"))) {
  root = path.dirname(root);
}

// walk every directory in the root and print out the contents of each file
const files = glob.sync("**/*.md", { cwd: root });
for (const file of files) {
  const filepath = path.join(root, file);
  console.log("----");
  console.log(`file: ./${file}`);
  console.log(fs.readFileSync(filepath, "utf-8"));
}
console.log("----");
