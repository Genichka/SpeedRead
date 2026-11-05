#!/bin/bash
# Збирає index.html і version.json з частин у src/
cd "$(dirname "$0")"
{ echo '<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  echo '<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#111217"><link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png"><link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
  sed '0,/<\/style>/s//<\/style><\/head><body>/' src/00_head.html
  echo '<script>'; cat src/00_version.js src/0[1-9]_*.js; echo '</script></body></html>'; } > index.html
node -e "const fs=require('fs');const APP=new Function(fs.readFileSync('src/00_version.js','utf8')+';return APP')();fs.writeFileSync('version.json',JSON.stringify(APP,null,1)+'\n')"
