#!/bin/bash

# Exit immediately if any command fails
set -e

echo "Syncing"

# # Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Not on main branch. Currently on: $CURRENT_BRANCH. Skipping sync."
    exit 0
fi

# # Fetch the latest changes without merging
echo "Fetching origin/main"
git fetch -q origin main

if ! git diff --quiet HEAD; then
    echo "Staging all changes"
    git add -A
    git commit -q -m "save"
else
    echo "No changes to commit"
fi

MERGE_BASE=$(git merge-base HEAD origin/main)
LOCAL_TREE=$(git rev-parse HEAD)
REMOTE_TREE=$(git rev-parse origin/main)

# If merge-base is different from either local or remote, we need to check for conflicts
if [ "$MERGE_BASE" != "$LOCAL_TREE" ] && [ "$MERGE_BASE" != "$REMOTE_TREE" ]; then
    # This checks if the merge would result in conflicts without actually doing the merge
    if ! git merge-tree "$MERGE_BASE" "$LOCAL_TREE" "$REMOTE_TREE" | grep -q "^+<<<<<<< "; then
        echo "No conflicts detected, merging"
        git merge -q origin/main
    else
        echo "Potential conflicts detected. Aborting sync."
        exit 0
    fi
else
    echo "No remote changes to merge"
fi

echo "Pushing to origin/main"
git push -q origin main

echo "Sync complete"
