import { readFileSync } from "fs";
import { unified } from "unified";
import remarkParse from "remark-parse";
import path from "path";
import { getRootDir } from "@common/data";

export function parseFlexibleJson(input: string): Record<string, any> {
  // Remove whitespace
  input = input.trim();

  // Ensure we have an object
  if (!input.startsWith("{") || !input.endsWith("}")) {
    throw new Error("Input must be an object");
  }

  // Remove outer braces
  input = input.slice(1, -1).trim();

  if (!input) return {};

  // Split on commas, but not within arrays or nested objects
  const pairs = splitTopLevel(input, ",");

  const result: Record<string, any> = {};

  for (const pair of pairs) {
    // Split on first colon
    const colonIndex = pair.indexOf(":");
    if (colonIndex === -1) continue;

    const key = pair.slice(0, colonIndex).trim();
    const value = pair.slice(colonIndex + 1).trim();

    // Remove quotes from key if present
    if (key.startsWith('"') && key.endsWith('"')) {
      result[key.slice(1, -1)] = parseValue(value);
      continue;
    }

    // Parse the value
    result[key] = parseValue(value);
  }

  return result;
}

function parseValue(value: string): any {
  value = value.trim();

  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Null
  if (value === "null") return null;

  // Array
  if (value.startsWith("[") && value.endsWith("]")) {
    const items = splitTopLevel(value.slice(1, -1), ",");
    return items.map((item) => parseValue(item.trim()));
  }

  // Object
  if (value.startsWith("{") && value.endsWith("}")) {
    return parseFlexibleJson(value);
  }

  // String - remove quotes if present
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  // Unquoted string
  return value;
}

function splitTopLevel(input: string, delimiter: string): string[] {
  const results: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of input) {
    if (char === "{" || char === "[") depth++;
    else if (char === "}" || char === "]") depth--;
    else if (char === delimiter && depth === 0) {
      if (current) results.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  if (current) results.push(current);
  return results;
}

function extractMetadata(text: string): {
  metadata: Record<string, any>;
  positions: Array<{ start: number; end: number }>;
} {
  // Match all instances of {{ ... }}
  const metadataRegex = /{{([^}]+)}}/g;
  const matches = text.matchAll(metadataRegex);

  const positions: Array<{ start: number; end: number }> = [];

  // Merge all metadata objects together
  const metadata = Array.from(matches).reduce((acc, match) => {
    try {
      // Store the start and end positions
      if (match.index !== undefined) {
        positions.push({
          start: match.index,
          end: match.index + match[0].length,
        });
      }

      // Parse the JSON inside the curly braces
      const metadata = parseFlexibleJson("{" + match[1] + "}");
      return { ...acc, ...metadata };
    } catch (e) {
      // If JSON parsing fails, skip this token
      console.warn(`Failed to parse metadata: ${match[1]}`);
      return acc;
    }
  }, {});

  return {
    metadata,
    positions,
  };
}

const ideas = readFileSync(path.join(getRootDir(), "notes/ideas-list.md"), "utf-8");
const ast = unified().use(remarkParse).parse(ideas);

// Iterate over root's direct children that are lists
ast.children
  .filter((node) => node.type === "list")
  .forEach((list) => {
    // Iterate over list items
    list.children.forEach((item, i) => {
      if (item.type === "listItem") {
        const startIndex = item.children[0].position?.start?.offset;
        const endIndex = item.children[item.children.length - 1].position?.end?.offset;
        const text = ideas.slice(startIndex, endIndex);
        const { metadata, positions } = extractMetadata(text);

        // Remove metadata tokens from text
        let cleanText = text;
        for (let i = positions.length - 1; i >= 0; i--) {
          let { start, end } = positions[i];
          // If the metadata is surrounded by spaces, remove one space from the start and end
          if (cleanText[start - 1] === " " && cleanText[end] === " ") start--;
          cleanText = cleanText.slice(0, start) + cleanText.slice(end);
        }
        cleanText = cleanText.trim();

        const lines = cleanText.split("\n");
        const title = lines[0].trim();
        const body = lines
          .slice(1)
          .map((line) => line.trim())
          .join("\n");

        console.log({ title, body, data: metadata });
      }
    });
  });
