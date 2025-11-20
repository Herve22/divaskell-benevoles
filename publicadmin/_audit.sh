#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

OUT="_audit_publicadmin_$(date +%Y%m%d_%H%M%S).txt"
echo "# Audit publicadmin $(pwd) — $(date)" | tee "$OUT"

echo -e "\n## Summary tree (depth 3)" | tee -a "$OUT"
if command -v tree >/dev/null 2>&1; then
  tree -ah --du -L 3 | tee -a "$OUT"
else
  echo "(tree non installé : sudo apt-get update && sudo apt-get install -y tree)" | tee -a "$OUT"
fi

echo -e "\n## File counts by extension" | tee -a "$OUT"
find . -type f ! -path "./node_modules/*" -printf '%f\n' \
| awk -F. '{print (NF>1?$NF:"(noext)")} ' \
| sort | uniq -c | sort -nr | tee -a "$OUT"

echo -e "\n## Top 30 largest files (apparent size)" | tee -a "$OUT"
du -ah --apparent-size . | sort -h | tail -n 30 | tee -a "$OUT"

echo -e "\n## Detailed listing (mtime, size)" | tee -a "$OUT"
find . -type f ! -path "./node_modules/*" -printf '%TY-%Tm-%Td %TH:%TM  %9s  %p\n' \
| sort | tee -a "$OUT"

echo -e "\n## HTML → referenced assets (href/src)" | tee -a "$OUT"
grep -Rho --include="*.html" 'href="[^"]+"|src="[^"]+"' . \
| sed -E 's/^(href|src)=\"//; s/\"$//' \
| sort -u | tee _referenced.txt | tee -a "$OUT"

echo -e "\n## All local assets (html/js/css/img/fonts/maps/json)" | tee -a "$OUT"
find . -type f -regex '.*\.\(html\|js\|css\|png\|jpg\|jpeg\|svg\|gif\|webp\|woff2\|woff\|ttf\|map\|json\)' \
 -printf '%p\n' | sed 's#^\./##' | sort -u | tee _allassets.txt | tee -a "$OUT"

echo -e "\n## Candidate UNUSED assets (present but not referenced in HTML)" | tee -a "$OUT"
comm -23 <(sort _allassets.txt) <(sed 's#^\./##' _referenced.txt | sort -u) \
| tee _candidates_unused.txt | tee -a "$OUT"

echo -e "\n## Zero-byte files" | tee -a "$OUT"
find . -type f -size 0 -printf '%p\n' | tee -a "$OUT"

echo -e "\n## Very old files (not modified in 90 days)" | tee -a "$OUT"
find . -type f -mtime +90 -printf '%TY-%Tm-%Td %TH:%TM  %p\n' | tee -a "$OUT"

echo -e "\n## Preview first 5 lines of HTML/JS/CSS" | tee -a "$OUT"
while IFS= read -r f; do
  echo -e "\n----- $f -----" | tee -a "$OUT"
  head -n 5 "$f" | tee -a "$OUT"
done < <(find . -type f \( -name "*.html" -o -name "*.js" -o -name "*.css" \) | sort)

echo -e "\n## Duplicate files by checksum" | tee -a "$OUT"
if command -v fdupes >/dev/null 2>&1; then
  fdupes -r .
else
  find . -type f -exec sha1sum {} + | sort \
  | awk 'BEGIN{prev="";last=""} {if($1==prev){print last "\n" $0 "\n"}; prev=$1; last=$0}' \
  | sed '/^$/d'
fi | tee -a "$OUT"

echo -e "\n== Generated files ==\n$OUT\n_referenced.txt\n_allassets.txt\n_candidates_unused.txt" | tee -a "$OUT"
