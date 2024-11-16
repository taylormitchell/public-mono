#!/bin/bash

# This script outputs the diffs of files changed in the last week,
# excluding empty files and empty commits, and includes the author, date, and filename.

# Specify the paths to include (e.g., your notes and posts directories)
INCLUDE_PATHS="data/notes/ data/posts/"

# Get all commits from the last day
commits=$(git rev-list --since="1 day ago" HEAD)

for commit in $commits; do
    # Get the list of files changed in the commit within the include paths
    files=$(git diff-tree --no-commit-id --name-only -r $commit -- $INCLUDE_PATHS)

    # Skip commits with no files in the include paths
    if [ -z "$files" ]; then
        continue
    fi

    # Extract author and date
    author=$(git show -s --format="%an" $commit)
    date=$(git show -s --format="%ad" --date=short $commit)

    # Initialize a flag to check if any diffs are printed for this commit
    diffs_printed=false

    for file in $files; do
        # Get the diff for the file in this commit
        diff_output=$(git diff-tree --no-commit-id --patch --unified=0 -r $commit -- "$file")

        # Skip empty diffs
        if [ -z "$diff_output" ]; then
            continue
        fi

        # Set the flag to true since we're printing diffs for this commit
        diffs_printed=true

        # Output the commit information only once
        if [ "$printed_header" != "$commit" ]; then
            echo "----------------------------------------"
            echo "Author: $author"
            echo "Date:   $date"
            echo
            printed_header=$commit
        fi

        # Print the filename
        echo "File: $file"
        echo

        # Clean up the diff output
        echo "$diff_output" | sed '/^diff --git/d' \
                             | sed '/^index /d' \
                             | sed '/^new file mode/d' \
                             | sed '/^deleted file mode/d' \
                             | sed '/^---/d' \
                             | sed '/^\+\+\+/d' \
                             | sed '/^@@.*@@/d' \
                             | sed '/\\ No newline at end of file/d'

        echo
    done

    # If no diffs were printed for this commit, skip adding extra separators
    if [ "$diffs_printed" = false ]; then
        continue
    fi
done
