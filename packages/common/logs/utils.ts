import fs from "fs";
import path from "path";
import { getRootDir } from "../data";
import { LogEntry } from "./types";
import { format, toZonedTime } from "date-fns-tz";

export function addLogEntry(logEntry: LogEntry, timeZone: string = "Canada/Eastern"): string {
  const logPath = path.join(getRootDir(), "log.jsonl");
  const datetime = logEntry.datetime ?? new Date();
  const logLine =
    JSON.stringify({
      ...logEntry,
      datetime: format(toZonedTime(datetime, timeZone), "yyyy-MM-dd'T'HH:mm:ssxxx", {
        timeZone,
      }),
    }) + "\n";
  fs.appendFileSync(logPath, logLine);
  return logPath;
}

export function getTodayLogEvents(): LogEntry[] {
  const logPath = path.join(getRootDir(), "log.jsonl");
  const today = new Date().toISOString().split("T")[0];
  return fs
    .readFileSync(logPath, "utf-8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line))
    .filter((entry) => entry.datetime.startsWith(today));
}
