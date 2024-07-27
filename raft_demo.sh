#!/bin/zsh

# Number of terminal windows to open
n=$1

for (( i=1; i<=n; i++ ))
do
  osascript <<EOF
tell application "Terminal"
    do script "cd Documents/raft; nvm use 21; node index.js $i $n"
end tell
EOF
done
