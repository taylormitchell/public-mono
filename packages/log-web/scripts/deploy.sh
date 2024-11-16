#!/bin/bash
git add --all
git commit -m "Deploy"
git push
scp .env.remote.production ec2-user@ec2-3-92-45-253.compute-1.amazonaws.com:~/code/home/packages/log-web/.env
ssh ec2-user@ec2-3-92-45-253.compute-1.amazonaws.com '
  cd code/home/packages/log-web &&
  git pull &&
  npm install &&
  pm2 delete log || true &&
  pm2 start npm --name log -- run dev
'