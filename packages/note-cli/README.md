# Note CLI

A command line tool for interacting with my notes in this repo.

## Basic Usage

List the content and filenames of all notes in a directory in reverse chronological order.

```
bun cli.ts list <directory>
```

Show the recent changes to my notes. I usually use this to get the changes from the last week and give it to an LLM to summarize.

```
bun cli.ts diff --since <time>
```

Open today's daily note.

```
bun cli.ts daily
```

Post a quick note.

```
bun cli.ts post -m <message>
```




