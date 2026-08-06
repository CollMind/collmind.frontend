#!/usr/bin/env bash
# Repo-relative paths of the files this working tree has touched — staged,
# unstaged and untracked, de-duplicated, existing files only.
#
# WHY (T-092): `npm run format` used to rewrite every file under src/, so a run
# meant to tidy one file reformatted committed work unrelated to the change in
# progress. Backend has the same script for the same reason.
#
# Deliberately a separate copy rather than a shared one: these are separate
# repositories with separate lifecycles, and reaching across a submodule boundary
# for a build script couples their checkouts.
#
# SCOPE: fixers only. `lint` here is a CHECKER (no --fix) and still reads the
# whole repo — narrowing a checker is how a guard goes blind.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

{
  git diff --name-only --diff-filter=d -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.css' '*.md'
  git diff --name-only --diff-filter=d --cached -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.css' '*.md'
  git ls-files --others --exclude-standard -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.css' '*.md'
} | sort -u | while IFS= read -r f; do
  [ -n "$f" ] && [ -f "$f" ] && printf '%s\n' "$f"
done
