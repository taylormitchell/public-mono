import { execSync } from "child_process";
import { Command } from "commander";
import path from "path";
import {
  listDir,
  createPost,
  createNote,
  getOrCreateDailyNote,
  openFile,
  getOrCreateWeeklyNote,
  getOrCreateMonthlyNote,
} from "@common/note";
import { getRepoRoot, getRootDir } from "@common/data";
import { readFileSync } from "fs";
import { addLogEntry, getTodayLogEvents } from "@common/logs/utils";
import { LogEntry, parseDuration, formatDuration, LogEntrySchema } from "@common/logs/types";

const program = new Command();

function parseDateOrOffset(dateOrOffset: string): Date | number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOrOffset)) {
    const [year, month, day] = dateOrOffset.split("-").map(Number);
    return new Date(year, month - 1, day);
  } else if (!isNaN(parseInt(dateOrOffset))) {
    return parseInt(dateOrOffset);
  } else {
    throw new Error(
      `Invalid input: must be a date in YYYY-MM-DD format or a number. Received: ${dateOrOffset}`
    );
  }
}

program
  .command("list [dir]")
  .description("List directory contents")
  .action((dir) => {
    listDir(path.join(getRootDir(), dir || ""));
  });

program
  .command("post [path]")
  .option("-m, --message <content>", "content of the post")
  .description("Create a new post with optional content")
  .action((p: string | undefined, options: Partial<{ message: string }>) => {
    if (p !== undefined && !path.isAbsolute(p)) {
      if (p.startsWith("@")) {
        p = path.join(getRootDir(), p.slice(1));
      } else {
        p = path.join(process.cwd(), p);
      }
    }
    p = createPost(p, options.message);
    if (!options.message) {
      openFile(p);
    } else {
      console.log(`Created post at ${p}`);
    }
  });

program
  .command("note [name]")
  .description("Create a new note with optional name")
  .action((name) => {
    createNote(name);
  });

program
  .command("daily [dateOrOffset]")
  .description("Open or create daily note with optional date or offset from today")
  .option("-n, --no-open", "Create the note without opening it")
  .action((dateOrOffset, options) => {
    const shouldOpen = options.open !== false;
    const date = dateOrOffset ? parseDateOrOffset(dateOrOffset) : undefined;
    const path = getOrCreateDailyNote(date);
    if (shouldOpen) {
      openFile(path);
    }
  });

program
  .command("weekly [dateOrOffset]")
  .description("Open or create this week's note with optional date or offset from today")
  .action((dateOrOffset) => {
    const date = dateOrOffset ? parseDateOrOffset(dateOrOffset) : undefined;
    const path = getOrCreateWeeklyNote(date);
    openFile(path);
  });

program
  .command("monthly")
  .description("Open or create this month's note")
  .action(() => {
    const path = getOrCreateMonthlyNote();
    openFile(path);
  });

program
  .command("sync")
  .description("Commit and push all changes")
  .action(() => {
    execSync(
      `cd ${__dirname} && git add --all && git commit -m "sync" && git pull --rebase && git push`
    );
  });

program
  .command("diff")
  .description("Show diff of recent changes in notes")
  .option("--since <time>", "Time range for diff (e.g., '7 days ago')", "7 days ago")
  .action((options) => {
    const scriptPath = path.join(__dirname, "scripts", "git-diff.sh");
    const command = `bash "${scriptPath}" "${options.since}"`;
    try {
      const output = execSync(command, { encoding: "utf-8", cwd: getRepoRoot() });
      console.log(output);
    } catch (error) {
      console.error("Error executing git-diff script:", error);
    }
  });

const logCommand = program.command("log").description("Add a log entry to log.jsonl");
LogEntrySchema.options.forEach((schema) => {
  const type = schema.shape.type.value;
  const command = logCommand.command(type);
  const shortFlags = new Set();

  Object.entries(schema.shape).forEach(([key, value]) => {
    if (key === "type") return;
    let shortFlag = key[0];
    while (shortFlags.has(shortFlag) && shortFlag.length <= key.length) {
      shortFlag = key.slice(0, shortFlag.length + 1);
    }
    shortFlags.add(shortFlag);
    const description = value.description || `Specify the ${key}`;
    command.option(`-${shortFlag}, --${key} <${key}>`, description);
  });

  command.action((options) => {
    const logEntry: Partial<LogEntry> = { type, ...options };
    try {
      const validatedEntry = LogEntrySchema.parse(logEntry);
      addLogEntry(validatedEntry);
    } catch (error) {
      console.error("Invalid log entry:", error.message);
    }
  });
});

program
  .command("today")
  .description("Output today's daily note and summarize log events")
  .action(() => {
    // Output today's daily note
    const todayNote = getOrCreateDailyNote();
    console.log("Today's Daily Note:");
    console.log(readFileSync(todayNote, "utf-8"));

    // Summarize today's log events
    console.log("\nToday's Log Events Summary:");
    const logEvents = getTodayLogEvents();

    if (logEvents.length > 0) {
      const summary = logEvents.reduce((acc, event) => {
        if (!acc[event.type]) {
          acc[event.type] = { count: 0, totalDuration: 0, message: "" };
        }
        acc[event.type].count++;
        if (event.duration) {
          acc[event.type].totalDuration += parseDuration(event.duration);
        }
        if (event.message) {
          acc[event.type].message = event.message;
        }
        return acc;
      }, {});

      Object.entries(summary).forEach(([type, data]: [string, any]) => {
        let details = [data.totalDuration && formatDuration(data.totalDuration), data.message]
          .filter(Boolean)
          .join(" ");
        details = details ? `(${details})` : "";
        console.log(`${type}: ${data.count} ${details}`);
      });
    } else {
      console.log("No log events for today.");
    }
  });

program.parse(process.argv);
