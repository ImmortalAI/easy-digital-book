#!/usr/bin/env bash
set -euo pipefail
if ! command -v epubcheck >/dev/null 2>&1; then
  echo "epubcheck is not installed; skipping validation" >&2
  exit 0
fi
for file in "$@"; do
  epubcheck "$file"
done
