#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration Variables (modify these as needed)
NEW_REPO_URL="git@github.com:taylormitchell/public-home.git"  # URL of your new public GitHub repository
NEW_REPO_PATH="/tmp/public-home"

# Check if the script is run inside a Git repository
if [ ! -d ".git" ]; then
    echo "Error: This script must be run from the root of a Git repository."
    exit 1
fi

# Remove the existing public repository if it exists
if [ -d "$NEW_REPO_PATH" ]; then
    rm -rf "$NEW_REPO_PATH"
fi

# Create a new directory for the public repository
mkdir "$NEW_REPO_PATH"

# Use rsync to copy files, excluding the specified directory and the .git directory
rsync -av --exclude="data" --exclude=".git" --exclude=".github" --exclude=".vscode" --exclude="node_modules" ./ "$NEW_REPO_PATH"

# Create data directory and add .gitignore
mkdir -p "$NEW_REPO_PATH/data"
echo "This directory included private data so was excluded from the public mirror" > "$NEW_REPO_PATH/data/README.md"

# Navigate to the new repository directory
cd "$NEW_REPO_PATH"

echo "Initializing new Git repository"
rm -rf .git
git init
git branch -m main

echo "Adding all files to the new repository"
git add .
git commit -m "Public version"

echo "Pushing to the public repository"
git remote add origin "$NEW_REPO_URL"
git push -uf origin main

echo "Cleaning up"
cd -
rm -rf "$NEW_REPO_PATH"

echo "Repository published to $NEW_REPO_URL"

