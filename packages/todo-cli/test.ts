import { listTodosDueToday } from "@common/todo/parsers";
import { getRootDir } from "@common/data";

const md = `
# Some document
with some text
TODO something {#CqB6wS}
TODO another thing {due: 2024-08-12}
last
`.trim();

// const res = parseMarkdown(md);
// console.log(JSON.stringify(res, null, 2));

// const res = parseMarkdownFile(path.join(__dirname, "test.md"));
// console.log(JSON.stringify(res, null, 2));

// const s = "test {#123kd:f} and";
// const m = s.match(/\{#(\w+)\}/);
// console.log(m);

listTodosDueToday(getRootDir(), 0, true);
