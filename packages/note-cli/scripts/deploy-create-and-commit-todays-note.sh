job="0 0 * * * cd $PWD && bash scripts/create-and-commit-todays-note.sh"

# Check if the job already exists in the crontab
if ! crontab -l | grep -Fq "create-and-commit-todays-note"; then
    # If the job doesn't exist, add it to the crontab
    (crontab -l 2>/dev/null; echo "$job") | crontab -
    echo "Cron job added successfully."
else
    echo "Cron job already exists. No changes made."
fi