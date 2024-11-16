# REST API

A REST API for serving and editing files in [my digital home](../../README.md). When changes are made via this API, they are committed to the repo and synced to the server.

For an example frontend to this API, check out the [logging web app](../log-web/README.md).

## Basic Usage

Get a file:
```bash
curl http://localhost:3077/api/files/path/to/file.md
```

Create or update a file:
```bash
curl -X PUT http://localhost:3077/api/files/path/to/file.md \
  -H "Content-Type: application/json" \
  -d '{"content": "# New File\n\nThis is the content"}'
```

Append to a file:
```bash
curl -X PATCH http://localhost:3077/api/files/path/to/file.md \
  -H "Content-Type: application/json" \
  -d '{"method": "append", "content": "\n\nAppended content"}'
```

Add log entry:
```bash
curl -X POST http://localhost:3077/api/log \
  -H "Content-Type: application/json" \
  -d '{
    "type": "meditated",
    "datetime": "2024-04-15T14:30:00-04:00",
    "duration": "20m",
    "message": "Morning meditation"
  }'
```










