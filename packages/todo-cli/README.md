# Todo CLI

A command line tool for interacting with my todos in this repo. Todos can be placed anywhere inside my [notes](/data/) directory. This CLI walks the notes and parses out any todos it finds.

## Basic Usage

List all todos.

```
bun cli.ts ls
```

List all todos due today.

```
bun cli.ts due
```

Create a new todo.

```
bun cli.ts todo <description>
```

