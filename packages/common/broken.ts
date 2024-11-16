import { glob } from "glob";
import path from "path";
import fs from "fs";
import { getRootDir } from "./note";

function parseLinks(line: string): string[] {
  const links: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === "[") {
      // consume text between [ and ]
      let alias = "";
      i += 1;
      let openParentheses = 1;
      while (i < line.length) {
        if (line[i] === "[") {
          openParentheses += 1;
        } else if (line[i] === "]") {
          openParentheses -= 1;
        }
        if (openParentheses === 0) {
          break;
        }
        alias += line[i];
        i += 1;
      }
      if (line[i + 1] === "(") {
        // consume link between ( and )
        let link = "";
        i = i + 2;
        openParentheses = 1;
        while (i < line.length) {
          if (line[i] === "(") {
            openParentheses += 1;
          } else if (line[i] === ")") {
            openParentheses -= 1;
          }
          if (openParentheses === 0) {
            break;
          }
          link += line[i];
          i += 1;
        }
        if (link) {
          if (link.startsWith("<") && link.endsWith(">")) {
            link = link.slice(1, -1);
          }
          links.push(link);
        }
      }
    }
    i += 1;
  }
  return links;
}

// search for broken file references
function cliBrokenFileReferenceSearch() {
  const rootDir = getRootDir();
  const markdownFiles = glob.sync(`${rootDir}/**/*.md`);
  for (const file of markdownFiles) {
    const fileDir = path.dirname(file);
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const links = parseLinks(line);
      for (const link of links) {
        if (link.startsWith("http")) {
          continue;
        }
        const filePath = path.join(fileDir, link);
        if (!fs.existsSync(filePath)) {
          console.log(`Broken file reference in ${file}: ${link}`);
        }
      }
    }
  }
}

cliBrokenFileReferenceSearch();
