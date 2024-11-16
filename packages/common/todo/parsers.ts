import fs from "fs";
import { glob } from "glob";
import chalk from "chalk";
import path from "path";
import { getRootDir } from "../data";
import { TODO_KEYWORDS, TODO_REGEX, Heading, Todo } from "./types";
import { dateToJournalPath } from "../note";
chalk.level = 3;

function pathToDate(pathname: string): Date | undefined {
  const parts = pathname.split("/").reverse();
  const day = parseInt(parts[0].split(".")[0]);
  if (isNaN(day)) {
    return;
  }
  const month = parseInt(parts[1]);
  if (isNaN(month)) {
    return;
  }
  if (month < 1 || month > 12) {
    return;
  }
  const year = parseInt(parts[2]);
  if (isNaN(year)) {
    return;
  }
  return new Date(year, month - 1, day);
}

function parseKeyValue(
  line: string,
  offset: number = 0
): { key: string; value: string; start: number; end: number } | undefined {
  for (let c = offset; c < line.length; c++) {
    if (line[c] === "{") {
      // handle id
      if (line[c + 1] === "#") {
        const match = line.slice(c).match(/\{#(\w+)\}/);
        if (match) {
          return { key: "id", value: match[1], start: c, end: c + match[0].length - 1 };
        }
      } else {
        // handle other key-value pairs
        const match = line.slice(c).match(/\{(\w+):([^:]*)\}/);
        if (match) {
          return { key: match[1], value: match[2], start: c, end: c + match[0].length - 1 };
        }
      }
    }
  }
}

function parseTodo(line: string) {
  if (!line) {
    return;
  }
  // only needs to start with the keyword
  const match = line.match(TODO_REGEX);
  if (!match) {
    return;
  }
  const [prefix, keyword] = match;
  const status = TODO_KEYWORDS.find((k) => k === keyword);
  if (!status) {
    return;
  }

  // Parse key-value pairs
  // Assume that once you hit the first key-value pair, all subsequent lines are key-value pairs
  const kvs: Map<string, { key: string; value: string }> = new Map();
  let kvStart: number | null = null;
  for (let c = 0; c < line.length; c++) {
    const kv = parseKeyValue(line, c);
    if (!kv) {
      break;
    }
    kvs.set(kv.key, kv);
    kvStart = kvStart || kv.start;
    c = kv.end + 1;
  }

  // Grab values for supported key-value pairs
  let due: Date | undefined = undefined;
  const dueKv = kvs.get("due");
  if (dueKv) {
    const parts = dueKv.value.split("-");
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    due = new Date(year, month, day);
    due.setHours(0, 0, 0, 0);
  }
  let id: string | undefined = undefined;
  const idKv = kvs.get("id");
  if (idKv) {
    id = idKv.value.slice(1);
  }

  const text = line.slice(prefix.length, kvStart || line.length).trim();
  return { status, text, due, id };
}

function parseHeading(line: string) {
  const match = line.match(/^#+/);
  if (!match) {
    return;
  }
  const level = match[0].length;
  const text = line.slice(level).trim();
  return { level, text };
}

export function parseMarkdown(content: string) {
  const lines = content.split("\n");
  const todos: Todo[] = [];
  const currentHeadings: Heading[] = [];
  for (let i = 0; i < lines.length; i++) {
    const heading = parseHeading(lines[i]);
    if (heading) {
      currentHeadings.slice(heading.level);
      currentHeadings.push({ type: "heading", level: heading.level, text: heading.text });
      continue;
    }
    const todo = parseTodo(lines[i]);
    if (todo) {
      todos.push({ ...todo, type: "todo", headings: currentHeadings });
      continue;
    }
  }
  return todos;
}

export function parseMarkdownFile(filename: string): Todo[] {
  const content = fs.readFileSync(filename, "utf-8");
  let todos = parseMarkdown(content);
  const date = pathToDate(filename);
  return todos.map((todo) => ({ ...todo, due: todo.due || date, filename }));
}

function todoToMarkdown(todo: Todo): string {
  return `${todo.status} ${todo.text} ${
    todo.due ? `{due: ${todo.due.toISOString().split("T")[0]}}` : ""
  }`;
}

export function addTodo(todo: Todo, filepath?: string): string {
  if (!filepath) {
    if (todo.due) {
      filepath = dateToJournalPath(todo.due);
    } else {
      filepath = path.join(getRootDir(), "gtd/todo.md");
    }
  } else if (!filepath.startsWith(getRootDir())) {
    throw new Error("Invalid filepath");
  }
  const fileDate = pathToDate(filepath);
  if (fileDate && todo.due && equal(todo.due, fileDate)) {
    // if we're putting a todo on the same day as the file, don't include the due date
    todo = { ...todo, due: undefined };
  }
  const content = fs.readFileSync(filepath, "utf-8");
  const newContent = todoToMarkdown(todo) + "\n" + content;
  fs.writeFileSync(filepath, newContent);
  // commitAndPush(filepath, `Add todo: ${todo.text}`);
  return filepath;
}

export function groupBy(arr: Todo[], key: string): Map<any, Todo[]> {
  return arr.reduce((acc, todo) => {
    const value = todo[key as keyof Todo];
    if (!acc.has(value)) {
      acc.set(value, []);
    }
    acc.get(value)!.push(todo);
    return acc;
  }, new Map<any, Todo[]>());
}

export function getTodos(rootPath?: string, ignore = true): Todo[] {
  const root = rootPath ? path.resolve(rootPath) : getRootDir();
  const files = glob.sync(`${root}/**/*.md`);
  return files
    .filter((file) => (ignore ? !file.includes("test.md") : true))
    .flatMap((file) => parseMarkdownFile(file))
    .map((todo) => ({
      ...todo,
      relativeFilename: todo.filename ? path.relative(getRootDir(), todo.filename) : undefined,
    }));
}

/**
 * Compares two dates and returns true if the first date is less than or equal to the second date
 * Only compares year, month, and day.
 */
export function lessThanOrEqualTo(date1: Date, date2: Date): boolean {
  return date1.toISOString().split("T")[0] <= date2.toISOString().split("T")[0];
}

function equal(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function listTodosDueToday(
  pathname: string,
  offset: number = 0,
  ignoreTodayPage: boolean = false
): void {
  const rootDir = getRootDir();
  const todosByFile = groupBy(getTodos(pathname), "filename");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date();
  day.setDate(day.getDate() + offset);
  day.setHours(0, 0, 0, 0);

  const dueTodosByFile = new Map<string, Todo[]>();
  todosByFile.forEach((todos, filename) => {
    // Ignore today's daily page if the option is set
    if (ignoreTodayPage && pathToDate(filename)?.getTime() === today.getTime()) {
      return;
    }

    const dueToday = todos.filter(
      (todo) => todo.status !== "DONE" && todo.due && lessThanOrEqualTo(todo.due, day)
    );
    if (dueToday.length > 0) {
      dueTodosByFile.set(filename, dueToday);
    }
  });

  if (dueTodosByFile.size === 0) {
    console.log(chalk.green("No results. Yay!"));
    return;
  }

  dueTodosByFile.forEach((todos, filename) => {
    const relativeFilename = path.relative(rootDir, filename);
    console.log(chalk.cyan(`File: ${relativeFilename}`));
    console.log(chalk.cyan("=".repeat(relativeFilename.length + 6)));
    todos.forEach((todo) => {
      console.log(
        chalk.bold(`  ${todo.status}: ${todo.text}`),
        todo.due ? chalk.green(`Due: ${todo.due.toISOString().split("T")[0]}`) : ""
      );
    });
    console.log();
  });
}

// add the given line to the top of the /gtd/someday-maybe.md file
export function addSomedayMaybe(line: string): void {
  const filename = path.join(__dirname, "..", "gtd", "someday-maybe.md");
  fs.appendFileSync(filename, line);
}
