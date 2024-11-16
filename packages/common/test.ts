import { processTemplate } from "./note";

const md = `
# {{date}}

## morning
- morning routine
    {{morning-routine}}

## work
- start of workday routine
    {{start-of-workday-routine }}



- see mew




- end of workday routine
    {{end-of-workday-routine}}
- go to the gym?

## evening
`;

console.log(processTemplate(md));

// function testDailyNoteTemplate() {
//   const md = fs.readFileSync(getTemplatePath("daily-note-template"), "utf-8");
//   console.log(processTemplate(md));
// }

// testDailyNoteTemplate();

// getTodos();

// const date = new Date();
// date.setDate(date.getDate() + 1);
// const fn = addTodo(
//   {
//     type: "todo",
//     text: "test and stuff",
//     status: "TODO",
//     due: date,
//   },
//   "/Users/taylormitchell/Code/taylors-tech/data/journals/2024/august/25.md"
// );

// const todos = parseMarkdownFile(fn);
// console.log(todos);
