import * as fs from "fs";
import * as path from "path";

function isTextFile(filePath: string): boolean {
  const textExtensions = [".txt", ".md", ".ts", ".js", ".html", ".css", ".json", ".xml"];
  return textExtensions.includes(path.extname(filePath).toLowerCase());
}

type SearchResults = { [filePath: string]: { line: number; content: string }[] };

function searchForSubstring(
  dir: string,
  substring: string,
  { recursive = true, maxDepth = 5 } = {}
): SearchResults {
  const results: SearchResults = {};

  function walkDir(currentPath: string, depth: number) {
    if (depth > maxDepth) return;

    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && recursive) {
        walkDir(filePath, depth + 1);
      } else if (stat.isFile() && isTextFile(filePath) && stat.size <= 1000000) {
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          content.split("\n").forEach((line, i) => {
            if (line.includes(substring)) {
              if (!results[filePath]) {
                results[filePath] = [];
              }
              results[filePath].push({ line: i, content: line.trim() });
            }
          });
        } catch (error) {
          console.error(`Error reading file ${filePath}: ${error}`);
        }
      }
    }
  }

  walkDir(dir, 0);
  return results;
}

function printHelp() {
  console.log(`Usage: node search.ts <substring> [dir]`);
}

function printResults(results: SearchResults) {
  console.log(`Found ${Object.keys(results).length} files:`);
  for (const filePath in results) {
    console.log(`\n${filePath}`);
    results[filePath].forEach(({ line, content }) => {
      console.log(`  ${line}: ${content}`);
    });
  }
}

function cliSubstringSearch() {
  const substring = process.argv[2];
  if (!substring) {
    printHelp();
    process.exit(1);
  }
  const dir = process.argv[3] || process.cwd();
  if (!fs.existsSync(dir)) {
    console.error(`Directory '${dir}' does not exist.`);
    printHelp();
    process.exit(1);
  }

  const results = searchForSubstring(dir, substring);
  printResults(results);
}

function cliFileReferenceSearch() {
  const rootDir = process.cwd();
  const filesDir = path.join(rootDir, "posts");

  console.log(`Searching for references to files in ${filesDir}`);
  const allResults: { [filename: string]: SearchResults } = {};
  const filenames: string[] = fs.readdirSync(filesDir);
  for (const filename of filenames) {
    const results = searchForSubstring(rootDir, filename);
    allResults[filename] = results;
  }
  const noResults = Object.values(allResults).every((results) => Object.keys(results).length === 0);
  if (noResults) {
    console.log("No results found");
  }
  for (const filename in allResults) {
    if (Object.keys(allResults[filename]).length > 0) {
      console.log(`Results for ${filename}:`);
      printResults(allResults[filename]);
    }
  }
}

cliFileReferenceSearch();
