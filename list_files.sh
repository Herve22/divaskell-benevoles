#!/bin/bash
# 📁 Liste propre de ton projet, sans node_modules, ni fichiers cachés

echo "=== Structure du projet ==="
find . \
  -path "./node_modules" -prune -o \
  -path "./.git" -prune -o \
  -path "./.cache" -prune -o \
  -type f -printf "%P\n" | sort
