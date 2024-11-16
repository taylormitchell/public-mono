import { Command } from "commander";
import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize an array to store conversation history
let conversationHistory: ChatCompletionMessageParam[] = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function chat() {
  rl.question("You: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      rl.close();
      return;
    }

    try {
      // Add user input to conversation history
      conversationHistory.push({ role: "user", content: input });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: conversationHistory,
      });

      const aiResponse = response.choices[0].message.content?.trim();
      console.log("AI:", aiResponse);

      // Add AI response to conversation history
      conversationHistory.push({ role: "assistant", content: aiResponse || "" });

      chat(); // Continue the conversation
    } catch (error) {
      console.error("Error:", error);
      chat(); // Continue despite error
    }
  });
}

const program = new Command();

program
  .version("1.0.0")
  .description("A CLI tool to interact with OpenAI")
  .action(() => {
    console.log("Welcome to the AI chat. Type 'exit' to end the conversation.");
    chat();
  });

program.parse(process.argv);
