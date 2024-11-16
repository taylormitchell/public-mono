#!/bin/bash

# Log the outputs of a command to a file, with a job name.
# Usage: some-command | log.sh "job-name"
job_name="$1"
while IFS= read -r line; do
    if [ -n "$job_name" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$job_name] $line" >> ~/Dropbox/data/logs/crontab.log
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line" >> ~/Dropbox/data/logs/crontab.log
    fi
done