import { Command } from "commander";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { getTodos, groupBy, lessThanOrEqualTo, listTodosDueToday } from "@common/todo/parsers";
import { getRootDir } from "@common/data";
import { Todo } from "@common/todo/types";
chalk.level = 3;

const program = new Command();

program.version("1.0.0").description("A CLI tool for managing todos in markdown files");

function renderByFile(todos: Todo[]) {
  const todosByFile = groupBy(todos, "filename");
  todosByFile.forEach((todos, filename) => {
    const relativeFilename = path.relative(getRootDir(), filename);
    console.log(chalk.cyan(`File: ${relativeFilename}`));
    console.log(chalk.cyan("=".repeat(relativeFilename.length + 6)));
    todos.forEach((todo) => {
      console.log(
        chalk.bold(`  ${todo.status}: ${todo.text}`),
        todo.due ? chalk.green(`Due: ${todo.due.toISOString().split("T")[0]}`) : ""
      );
    });
  });
}

program
  .command("ls [pathname]")
  .description("List all todos")
  .option("-j, --ignore-journals", "Ignore todos from journal entries")
  .option(
    "-d, --due [date]",
    "Show todos due by the specified date or offset (e.g., '2023-09-15' or '3' for 3 days from now)"
  )
  .action((pathname, options) => {
    let todos = getTodos(pathname).filter((todo) => todo.status === "TODO");
    if (options.ignoreJournals) {
      const rootDir = getRootDir();
      todos = todos.filter((todo) => !todo.filename.startsWith(path.join(rootDir, "journals")));
    }
    if (options.due) {
      let dueDate = new Date();
      if (options.due === true) {
        // no-op
      } else if (options.due.match(/^\d+$/)) {
        const offset = parseInt(options.due);
        dueDate.setDate(dueDate.getDate() + offset);
      } else if (options.due.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dueDate = new Date(options.due);
      }
      todos = todos.filter((todo) => todo.due && lessThanOrEqualTo(todo.due, dueDate));
    }
    renderByFile(todos);
  });

program
  .command("due [offset]")
  .description("List todos due today")
  .option("-i, --ignore-today", "Ignore todos from today's daily page")
  .action((offset = 0, options) => {
    listTodosDueToday(getRootDir(), parseInt(offset), options.ignoreToday);
  });

// add a line to the top of the /gtd/someday-maybe.md file
program
  .command("sm [line]")
  .description("Add a line to the top of the /gtd/someday-maybe.md file")
  .action((line) => {
    const filename = path.join(getRootDir(), "gtd", "someday-maybe.md");
    fs.appendFileSync(filename, "\n" + line);
  });

// add a todo to the bottom of the /gtd/todo.md file
program
  .command("todo [line]")
  .description("Add a todo to the bottom of the /gtd/todo.md file")
  .action((line) => {
    const filename = path.join(getRootDir(), "gtd", "todo.md");
    fs.appendFileSync(filename, "\nTODO " + line);
  });

program.parse(process.argv);
