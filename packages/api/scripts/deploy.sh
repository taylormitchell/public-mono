#!/bin/bash
git add --all
git commit -m "Deploy"
git push
cp .env .env.production
echo "AUTH_DISABLED=false" >> .env.production
echo "COMMIT_ON_SAVE=true" >> .env.production
echo "SYNC_ENABLED=true" >> .env.production
scp .env.production ec2-user@ec2-3-92-45-253.compute-1.amazonaws.com:~/code/home/packages/api/.env
rm .env.production
ssh ec2-user@ec2-3-92-45-253.compute-1.amazonaws.com '
  cd code/home/packages/api &&
  git stash save "Stashing changes during api deploy $(date)" &&
  git pull --rebase &&
  npm i &&
  pm2 delete api || true &&
  pm2 start npm --name api -- run start
'
