#!/bin/sh
# Renders the #1 deal card from each listed Top 50 page of the live site, numbered card1.png, card2.png, ...
# sh live_cards.sh <outDir> <list ids...>    e.g. sh live_cards.sh out her him under-10 tech home
set -e
OUT="$1"; shift
HERE=$(dirname "$0")
mkdir -p "$OUT"
i=1
for list in "$@"; do
  node "$HERE/card_render.mjs" "https://www.ubottega.com/top/$list" "$OUT/src-$list" 1 > "$OUT/src-$list.json"
  cp "$OUT/src-$list/card1.png" "$OUT/card$i.png"
  echo "card$i ($list): $(grep -o '"title": "[^"]*"' "$OUT/src-$list.json" | head -1) $(grep -o '"price": "[^"]*"' "$OUT/src-$list.json" | head -1)"
  i=$((i + 1))
done
