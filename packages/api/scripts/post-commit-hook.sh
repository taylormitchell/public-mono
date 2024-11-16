#!/bin/sh

# Create function to log with timestamp
root=$(git rev-parse --show-toplevel)
log_file=$root/sync.log
if [ ! -f $log_file ]; then
    touch $log_file
fi
log() {
    echo "$(date '+%Y-%m-%dT%H:%M:%S%z') - $1" >> $log_file
}

# Log the top commit sha
log "Running post-commit hook after commit $(git rev-parse HEAD | cut -c1-7)"

# Fetch the latest changes from the remote
git fetch origin

# Attempt to rebase
if git rebase origin/main; then
    log "Rebase successful, pushing changes..."
    if git push origin main; then
        log "Push successful"
    else
        log "Error: Failed to push changes"
        exit 1
    fi
else
    log "Error: Rebase failed"
    # Abort the rebase to return to the previous state
    git rebase --abort
    exit 1
fi