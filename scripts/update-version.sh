#!/usr/bin/env bash

set -euo pipefail

date_today=$(date +%Y-%m-%d)

update_version() {
  local file=$1
  local current_version
  current_version=$(awk '/@version/ {print $2; exit}' "$file")
  local new_version="$date_today"

  if [[ "$current_version" == "$date_today"* ]]; then
    if [[ "$current_version" =~ $date_today\ ([0-9]{2}:[0-9]{2}(:[0-9]{2})?) ]]; then
      local time
      time=${BASH_REMATCH[1]}
      if [[ "$time" =~ ([0-9]{2}:[0-9]{2})$ ]]; then
        new_version="$date_today ${BASH_REMATCH[1]}:$(date +%S)"
      else
        new_version="$date_today $(date +%H:%M:%S)"
      fi
    else
      new_version="$date_today $(date +%H:%M)"
    fi
  fi

  echo "Updating $file from '$current_version' to '$new_version'"
  sed -i -e "s/@version\s\+.*/@version $new_version/" "$file"
}

for file in *.user.js; do
  [ -f "$file" ] && update_version "$file"
done
