# update crontab
crontab crontab

# update .zprofile
rm ~/.zprofile
ln -s $(pwd)/.zprofile ~/.zprofile
source ~/.zprofile

