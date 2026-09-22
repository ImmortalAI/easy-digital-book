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
  echo "unpack the release next to it at $(dirname "$DEFAULT_JAR") or set EPUBCHECK_JAR" >&2
  exit 1
fi

# The released jar is thin: its manifest points at lib/*.jar beside it. Copying
# the jar alone leaves java to fail deep in a NoClassDefFoundError stack trace,
# so say plainly what is missing instead.
if command -v unzip >/dev/null 2>&1; then
  jar_dir="$(cd "$(dirname "$JAR_PATH")" && pwd)"
  # An unreadable jar just skips this check; java reports its own error then.
  # Without the `|| true` its exit status would trip pipefail and abort here.
  class_path="$({ unzip -p "$JAR_PATH" META-INF/MANIFEST.MF 2>/dev/null || true; } | tr -d '\r' |
    awk '/^Class-Path:/ {flag=1; sub(/^Class-Path: /, ""); printf "%s", $0; next}
         /^ / {if (flag) {sub(/^ /, ""); printf "%s", $0; next}}
         {flag=0}')"
  missing=()
  for entry in $class_path; do
    [[ -f "$jar_dir/$entry" ]] || missing+=("$entry")
  done
  if ((${#missing[@]} > 0)); then
    echo "epubcheck ${EPUBCHECK_VERSION} is missing ${#missing[@]} of its dependencies" >&2
    echo "for example ${missing[0]}, expected next to $(basename "$JAR_PATH") in $jar_dir" >&2
    echo "unpack the whole epubcheck release there, not just the jar" >&2
    exit 1
  fi
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
