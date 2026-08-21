#!/bin/sh
PORT="${PORT:-3000}"
exec npx next start -p "$PORT"
