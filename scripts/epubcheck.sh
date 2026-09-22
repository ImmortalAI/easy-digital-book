#!/usr/bin/env bash
set -euo pipefail

readonly EPUBCHECK_VERSION="5.2.1"
readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DEFAULT_JAR="$ROOT_DIR/.tools/epubcheck/epubcheck-${EPUBCHECK_VERSION}.jar"

if (($# == 0)); then
  echo "usage: $0 FILE.epub [...]" >&2
  exit 2
fi

readonly JAR_PATH="${EPUBCHECK_JAR:-$DEFAULT_JAR}"
if [[ "$(basename "$JAR_PATH")" != "epubcheck-${EPUBCHECK_VERSION}.jar" ]]; then
  echo "epubcheck ${EPUBCHECK_VERSION} is required; got jar $(basename "$JAR_PATH")" >&2
  exit 1
fi
if [[ ! -f "$JAR_PATH" ]]; then
  echo "epubcheck ${EPUBCHECK_VERSION} is required but was not found" >&2
  echo "install the pinned jar at $DEFAULT_JAR or set EPUBCHECK_JAR" >&2
  exit 1
fi
if ! command -v java >/dev/null 2>&1; then
  echo "Java is required to run epubcheck ${EPUBCHECK_VERSION}" >&2
  exit 1
fi

output="$(mktemp)"
trap 'rm -f "$output"' EXIT
java -jar "$JAR_PATH" "$@" 2>&1 | tee "$output"
if grep -Eiq '(^|[^[:alpha:]])WARNING([[:space:]:(-]|$)' "$output" || \
  grep -Eiq '\([1-9][0-9]*\)[[:space:]]+warnings?' "$output"; then
  echo "epubcheck reported warnings; refusing to pass validation" >&2
  exit 1
fi
