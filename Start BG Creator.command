#!/bin/bash
# Double-click in Finder to start AGIStudio Background Creator.
# Installs dependencies when needed, starts the dev server and opens your browser.
# Close this window (or press Ctrl+C) to stop it.

cd "$(dirname "$0")" || exit 1

pause_and_exit() {
  echo
  read -n 1 -s -r -p "Press any key to close this window."
  echo
  exit "${1:-1}"
}

# Finder doesn't always pass along the shell setup that puts Node on the PATH.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v npm >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js isn't installed. Get it from https://nodejs.org, then double-click this file again."
  pause_and_exit 1
fi

# Install on the first run, and again whenever the dependencies change.
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "Installing dependencies. This only takes a while the first time..."
  npm install || pause_and_exit 1
fi

echo
echo "Starting AGIStudio Background Creator. Your browser will open in a moment."
echo "Close this window or press Ctrl+C to stop."
echo
npm run dev -- --open
status=$?
# 130 means you pressed Ctrl+C, so there's no error to read.
if [ "$status" -ne 0 ] && [ "$status" -ne 130 ]; then
  pause_and_exit "$status"
fi
