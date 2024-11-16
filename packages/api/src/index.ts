import express, { NextFunction, Request, Response } from "express";
import { getRootDir } from "@common/data";
import { createPost, dateToJournalPath, getOrCreateJournalNote } from "@common/note";
import { addTodo, getTodos } from "@common/todo/parsers";
import fs from "fs";
import path from "path";
import { deserializeTodo } from "@common/todo/types";
import { addLogEntry } from "@common/logs/utils";
import { LogEntrySchema } from "@common/logs/types";
import { generateJwt, verifyJwt } from "./jwt";
import { config } from "dotenv";
import { execSync } from "child_process";
import cors from "cors";

function flattenOptionalParams(optionalParams: any[]) {
  return optionalParams.map((param) => {
    if (typeof param === "object") {
      try {
        return JSON.stringify(param);
      } catch (e) {
        param = param.toString();
      }
    }
    if (typeof param === "string" && param.includes("\n")) {
      return param.replace(/\n/g, " ");
    }
    return param;
  });
}

const log = {
  info: (message?: any, ...optionalParams: any[]) => {
    const flat = flattenOptionalParams(optionalParams);
    console.log(`[${new Date().toISOString()}] [INFO] `, message, ...flat);
  },
  warn: (message?: any, ...optionalParams: any[]) => {
    const flat = flattenOptionalParams(optionalParams);
    console.warn(`[${new Date().toISOString()}] [WARN] `, message, ...flat);
  },
  error: (message?: any, ...optionalParams: any[]) => {
    const flat = flattenOptionalParams(optionalParams);
    console.error(`[${new Date().toISOString()}] [ERROR] `, message, ...flat);
  },
};

const { parsed } = config();
const AUTH_DISABLED = parsed?.AUTH_DISABLED === "true";
const COMMIT_ON_SAVE = parsed?.COMMIT_ON_SAVE === "true";
const SYNC_ENABLED = parsed?.SYNC_ENABLED === "true";
const ADMIN_PASSWORD = parsed?.ADMIN_PASSWORD;

function commitAndPush(filePath: string, message?: string) {
  message = message || `Save ${filePath}`;
  try {
    const add = execSync(`git add ${filePath}`, { encoding: "utf-8" });
    log.info("Add output:", add.trim());
    const commit = execSync(`git commit -m "${message}"`, { encoding: "utf-8" });
    log.info("Commit output:", commit.trim());
    const push = execSync(`git push`, { encoding: "utf-8" });
    log.info("Push output:", push.trim());
  } catch (error) {
    log.error("Error during git commit and push:", error);
  }
}

const app = express();
const port = process.env.PORT || 3077;

function gitSync() {
  const stash = execSync("git stash -u", { encoding: "utf-8" });
  log.info("Stash output:", stash.trim());
  const pull = execSync("git pull --rebase", { encoding: "utf-8" });
  log.info("Pull output:", pull.trim());
  const push = execSync("git push", { encoding: "utf-8" });
  log.info("Push output:", push.trim());
  if (!stash.includes("No local changes to save")) {
    const pop = execSync("git stash pop", { encoding: "utf-8" });
    log.info("Pop output:", pop.trim());
  }
}

if (SYNC_ENABLED) {
  setInterval(() => {
    try {
      log.info("Syncing git on interval");
      gitSync();
    } catch (error) {
      log.error("Error during recurring git pull rebase:", error);
    }
  }, 1000 * 60 * 2);
}

app.use(cors());
app.use((req: Request, res: Response, next: NextFunction) => {
  log.info(`${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.static(getRootDir()));

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (AUTH_DISABLED) {
    next();
    return;
  }
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.split(" ")[1];
  try {
    verifyJwt(token);
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// Files API
app.get("/api/files/:path(*)", authMiddleware, (req: Request, res) => {
  const filePath = path.join(getRootDir(), req.params.path);
  if (fs.existsSync(filePath)) {
    if (fs.statSync(filePath).isFile()) {
      res.sendFile(filePath);
    } else if (fs.statSync(filePath).isDirectory()) {
      const files = fs.readdirSync(filePath);
      const links = files
        .sort((a, b) => a.localeCompare(b))
        .map((file) => {
          const fullPath = path.join(req.params.path, file);
          const isDirectory = fs.statSync(path.join(filePath, file)).isDirectory();
          return `<li><a href="/api/files/${fullPath}">${file}${isDirectory ? "/" : ""}</a></li>`;
        })
        .join("\n");

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Directory Listing: ${req.params.path}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            h1 { color: #333; }
            ul { list-style-type: none; padding-left: 0; }
            li { margin-bottom: 5px; }
            a { text-decoration: none; color: #0066cc; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Directory Listing: ${req.params.path}</h1>
          <ul>
            ${links}
          </ul>
        </body>
        </html>
      `;
      res.send(html);
    } else {
      res.status(400).json({ error: "Path is neither a file nor a directory" });
    }
  } else {
    res.status(404).json({ error: "Path not found" });
  }
});

app.put("/api/files/:path(*)", (req: Request, res) => {
  const filePath = path.join(getRootDir(), req.params.path);
  const content = req.body?.content || "";
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const exists = fs.existsSync(filePath);
  fs.writeFileSync(filePath, content);
  if (COMMIT_ON_SAVE) commitAndPush(filePath, exists ? "Update file" : "Create file");
  res
    .status(200)
    .json({ message: exists ? "File updated successfully" : "File created successfully" });
});

app.patch("/api/files/:path(*)", (req: Request, res) => {
  const filePath = path.join(getRootDir(), req.params.path);
  const { method, content } = req.body;

  if (!method || !content) {
    log.error("Method and content are required", req.body);
    return res.status(400).json({ error: "Method and content are required" });
  }

  if (!fs.existsSync(filePath)) {
    log.error("File not found", filePath);
    return res.status(404).json({ error: "File not found" });
  }

  switch (method) {
    case "append":
      fs.appendFileSync(filePath, "\n" + content);
      break;
    case "prepend":
      fs.writeFileSync(filePath, content + "\n" + fs.readFileSync(filePath, "utf-8"));
      break;
    case "overwrite":
      fs.writeFileSync(filePath, content);
      break;
    default:
      log.error("Invalid method", method);
      return res.status(400).json({ error: "Invalid method" });
  }
  if (COMMIT_ON_SAVE) commitAndPush(filePath);
  res.status(200).json({ message: "File updated successfully" });
});

app.delete("/api/files/:path(*)", (req: Request, res) => {
  const filePath = path.join(getRootDir(), req.params.path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    if (COMMIT_ON_SAVE) commitAndPush(filePath, "Delete file");
    res.status(200).json({ message: "File deleted successfully" });
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

// Log API
app.post("/api/log", authMiddleware, (req, res) => {
  log.info("Log entry", req.body);
  const result = LogEntrySchema.safeParse(req.body);
  if (!result.success) {
    console.error("Invalid log entry: ", result.error);
    return res.status(400).json({ error: "Invalid log entry", message: result.error.message });
  }
  const logEntry = result.data;
  const logPath = addLogEntry(logEntry);
  if (COMMIT_ON_SAVE) commitAndPush(logPath, "Add log entry");
  res.status(201).json({ message: "Log entry added successfully" });
});

// Note API
app.get("/api/note/daily", (req: Request, res) => {
  handleNoteRequest("daily", req, res);
});

app.get("/api/note/weekly", (req: Request, res) => {
  handleNoteRequest("weekly", req, res);
});

app.get("/api/note/monthly", (req: Request, res) => {
  handleNoteRequest("monthly", req, res);
});

function handleNoteRequest(type: "daily" | "weekly" | "monthly", req: Request, res: Response) {
  const { date, offset } = req.query;
  try {
    const notePath = getOrCreateJournalNote({
      type,
      date: date ? new Date(date as string) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    const content = fs.readFileSync(notePath, "utf-8");
    res.json({ content });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create journal note" });
  }
}

app.post("/api/note/post/:dir(*)", (req, res) => {
  const { dir } = req.params;
  const content = req.body?.content || "";
  const dirPath = path.join(getRootDir(), dir);
  const filePath = createPost(dirPath, content);
  if (COMMIT_ON_SAVE) commitAndPush(filePath, "Create new post");
  res.status(201).json({ message: "Post created successfully", path: filePath });
});

// Todos API
app.get("/api/todos", authMiddleware, (req: Request, res) => {
  const todos = getTodos();
  res.json({ todos });
});

app.post("/api/todos/today", authMiddleware, (req: Request, res) => {
  const todayPath = dateToJournalPath(new Date());
  return postTodoHandler(req, res, todayPath);
});

app.post("/api/todos/someday", authMiddleware, (req: Request, res) => {
  const somedayPath = path.join(getRootDir(), "gtd", "someday-maybe.md");
  return postTodoHandler(req, res, somedayPath);
});

app.post("/api/todos/:path(*)?", authMiddleware, (req: Request, res) => {
  const { path: relativePath } = req.params;
  return postTodoHandler(req, res, path.join(getRootDir(), relativePath));
});

function postTodoHandler(req: Request, res: Response, filepath?: string) {
  let todo;
  try {
    todo = deserializeTodo(req.body);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: "Invalid todo" });
  }
  filepath = filepath || path.join(getRootDir(), "gtd", "todo.md");
  console.log("filepath", filepath);
  addTodo(todo, filepath);
  if (COMMIT_ON_SAVE) commitAndPush(filepath, "Add todo");
  res.status(201).json({ message: "Todo added successfully", path: filepath });
}

// Auth API (placeholder)
app.post("/api/auth/login", (req: Request, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: generateJwt() });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

app.get("/api", (req: Request, res) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Documentation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
        h1 { color: #333; }
        h2 { color: #666; }
        ul { list-style-type: none; padding-left: 0; }
        li { margin-bottom: 10px; }
        code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>API Documentation</h1>
      <p>This API provides endpoints for managing files, notes, todos, and authentication.</p>
      
      <h2>Files</h2>
      <ul>
        <li><code>GET /api/files/:path</code> - Get file content</li>
        <li><code>GET /api/files/:dir</code> - List files in directory</li>
        <li><code>PUT /api/files/:path</code> - Update file content</li>
        <li><code>PATCH /api/files/:path</code> - Modify file content (append/prepend/overwrite)</li>
        <li><code>DELETE /api/files/:path</code> - Delete file</li>
      </ul>
      
      <h2>Notes</h2>
      <ul>
        <li><code>GET /api/note/daily</code> - Get or create daily note</li>
        <li><code>GET /api/note/weekly</code> - Get or create weekly note</li>
        <li><code>GET /api/note/monthly</code> - Get or create monthly note</li>
        <li><code>POST /api/note/post/:dir</code> - Add a post to specified directory</li>
      </ul>
      
      <h2>Todos</h2>
      <ul>
        <li><code>GET /api/todos</code> - List all todos</li>
        <li><code>POST /api/todos/:path</code> - Add todo to specific file</li>
        <li><code>POST /api/todos/today</code> - Add todo to today's note</li>
        <li><code>POST /api/todos/someday</code> - Add todo to someday-maybe.md</li>
        <li><code>POST /api/todos</code> - Add todo to todo.md</li>
      </ul>
      
      <h2>Auth</h2>
      <ul>
        <li><code>POST /api/auth/login</code> - Login (placeholder)</li>
      </ul>
    </body>
    </html>
  `;

  res.send(htmlContent);
});

app.get("/api/git/sync", authMiddleware, (req: Request, res) => {
  try {
    gitSync();
    res.status(200).json({ message: "Synced" });
  } catch (error) {
    log.error("Error during git pull rebase request:", error);
    res.status(500).json({ error: "Failed to sync" });
  }
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  log.error(err.stack);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});

app.listen(port, () => {
  log.info(`Server is running on http://localhost:${port}`);
});
