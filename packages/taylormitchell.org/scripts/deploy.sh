#!/bin/sh
set -e

# 1. Build resume
cd ../../data/resume
bash build.sh

# 2. Copy resume files to website directory
cp resume.html resume.css resume.pdf ../../packages/taylormitchell.org/

# 3. Deploy
cd -
rsync -av --delete ./ dh_r7ag6j@iad1-shared-b7-44.dreamhost.com:taylormitchell.org/