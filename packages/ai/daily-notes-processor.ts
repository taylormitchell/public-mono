import { execSync } from "child_process";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import { getRepoRoot } from "@common/data";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getLastDayNotes(): Promise<string> {
  const command = `bash ${__dirname}/git-diff-today.sh`;
  const output = execSync(command, { encoding: "utf-8", cwd: getRepoRoot() });
  return output;
}

async function analyzeNotes(notes: string) {
  const prompt = `Please analyze these markdown notes and:
1. Extract all TODOs, DONE, and MAYBE items
2. Identify any interesting insights or key points
3. Suggest potential connections to other notes or topics that might need their own files
4. Update any todo items with metadata (due dates and intervals) according to the exponential back-off rules

Notes content:
${notes}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant analyzing markdown notes. Pay special attention to TODO/DONE/MAYBE items and metadata in {key: value} format.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.choices[0].message.content;
}

async function main() {
  try {
    const notes = await getLastDayNotes();
    if (!notes) {
      console.log("No markdown files were changed in the last 24 hours.");
      return;
    }
    console.log("Analyzing notes from the last 24 hours...\n");
    const analysis = await analyzeNotes(notes);
    console.log(analysis);
  } catch (error) {
    console.error("Error processing notes:", error);
  }
}

main();
