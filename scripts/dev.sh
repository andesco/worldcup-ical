#!/bin/sh
# Run `wrangler dev` with secrets pulled from the macOS keychain, so nothing
# lives on disk (.dev.vars is intentionally absent).
#
# One-time setup if a lookup fails (prompts for the secret value):
#   security add-generic-password -a "$USER" -s FOOTBALL_DATA_TOKEN -w
#   security add-generic-password -a "$USER" -s ODDS_API_KEY -w
set -e

get() {
  security find-generic-password -s "$1" -w 2>/dev/null || {
    echo "error: '$1' not found in macOS keychain." >&2
    echo "add it with: security add-generic-password -a \"\$USER\" -s $1 -w" >&2
    exit 1
  }
}

FOOTBALL_DATA_TOKEN="$(get FOOTBALL_DATA_TOKEN)" \
ODDS_API_KEY="$(get ODDS_API_KEY)" \
exec npx wrangler dev "$@"
