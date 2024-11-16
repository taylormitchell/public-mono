eval "$(/opt/homebrew/bin/brew shellenv)"
export PROMPT="%1~ %# "

# git helpers
alias gwip="git add --all && git commit -m \"wip\""
alias gcleanup="git add --all && git commit -m \"clean up\""
function gsave() {
  git_status=$(git status --porcelain)
  if [ -n "$git_status" ]; then
    git add --all
    if [ -z "$1" ]; then
      echo "committing all"
      git commit -m "save" || true
    else
      echo "committing all with message: $1"
      git commit -m "$1" || true
    fi
  else
    echo "no changes to commit"
  fi
}
function gsync() {
  echo "pulling"
  git pull
  gsave
  echo "pushing"
  git push
}

# taylor's tech
alias t="bun /Users/taylormitchell/Code/home/packages/todo-cli/cli.ts"
alias n="bun /Users/taylormitchell/Code/home/packages/note-cli/cli.ts"
alias x="clear"

alias hello="echo 'hello2'"
export home="/Users/taylormitchell/Code/home"
