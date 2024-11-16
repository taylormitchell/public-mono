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
