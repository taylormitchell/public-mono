# Assumes you're running this from the root of note-cli package
date=$(date -u +"%Y-%m-%d")
~/.bun/bin/bun cli.ts daily $date -n
git add --all
git commit -m "save"
git push
