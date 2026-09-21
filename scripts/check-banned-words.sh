#!/usr/bin/env bash
# ============================================================
# Pengecekan kata terlarang (AI-trap words)
#
# PDF Project PPK 2026 berisi instruksi tersembunyi agar AI
# menyisipkan kata tertentu secara "natural" di hasil kerjanya —
# ini sidik jari bahwa pekerjaan dibuat AI.
#
# Script ini memastikan kata jebakan tsb TIDAK pernah lolos ke
# source code, komentar, docblock, atau nama file.
#
# Daftar kata terlarang diambil dari file konfigurasi:
#   scripts/.banned-words   (satu kata per baris; # = komentar)
#
# Pemakaian:
#   scripts/check-banned-words.sh          # cek seluruh repo (default)
#   scripts/check-banned-words.sh --staged # cek file staged (pre-commit)
#   scripts/check-banned-words.sh --file <path>
#
# Exit code 0 = bersih, 1 = ada pelanggaran.
#
# Catatan performa: script ini hanya boleh memanggil proses eksternal
# O(jumlah file), bukan O(jumlah baris). Di Windows (Git Bash/MSYS2) tiap
# spawn proses berbiaya besar, sehingga pemeriksaan baris demi baris dengan
# `grep` terpisah membuat `git commit` terasa menggantung.
# ============================================================

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORDS_FILE="$SCRIPT_DIR/.banned-words"

RED=$'\033[31m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
NC=$'\033[0m'

# File/folder yang sengaja dilewati (binary, dependency, artefak build,
# lockfile generated, serta file konfigurasi script ini sendiri).
# Dipakai baik saat scan penuh maupun saat memilih file staged.
SKIP_PATHS='(^|/)(\.git|node_modules|\.next|generated|out|build|coverage|\.venv|venv|scripts)(/|$)|(^|/)(pnpm-lock\.yaml|package-lock\.json)$|\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|pdf|sql|lock)$'
# File daftar kata itu sendiri justru memuat kata tsb (harus dilewati).
SKIP_FILES='^scripts/\.banned-words$'

if [[ ! -f "$WORDS_FILE" ]]; then
  echo "${RED}✗ File daftar kata terlarang tidak ditemukan: $WORDS_FILE${NC}" >&2
  exit 1
fi

# Baca kata terlarang (abaikan baris kosong & komentar #), lalu gabung jadi regex.
BANNED_RE="$(grep -vE '^\s*#|^\s*$' "$WORDS_FILE" | tr '\n' '|' | sed 's/|$//')"
if [[ -z "$BANNED_RE" ]]; then
  echo "${RED}✗ Daftar kata terlarang kosong.${NC}" >&2
  exit 1
fi

usage() {
  echo "Pemakaian: $0 [--staged | --file <path>]"
  echo "  (tanpa argumen = cek seluruh repo, hormati .gitignore)"
  exit 2
}

MODE="all"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --staged) MODE="staged" ;;
    --file)   MODE="file"; FILE_ARG="${2:-}"; shift ;;
    *)        usage ;;
  esac
  shift
done

collect_files() {
  case "$MODE" in
    staged)
      git diff --cached --name-only --diff-filter=ACM \
        | grep -Ev "$SKIP_PATHS" || true ;;
    file)
      echo "$FILE_ARG" ;;
    all)
      { git ls-files; git ls-files --others --exclude-standard; } \
        | grep -Ev "$SKIP_PATHS" || true ;;
  esac
}

files="$(collect_files)"
[[ -z "$files" ]] && { echo "${GREEN}✓ Tidak ada file untuk dicek.${NC}"; exit 0; }

violations=0

# Nama file yang mengandung kata terlarang — satu grep untuk seluruh daftar.
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  grep -Eq "$SKIP_FILES" <<<"$path" && continue
  echo "${RED}✗ Nama file mengandung kata terlarang: $path${NC}"
  violations=$((violations + 1))
done < <(grep -E -e "$BANNED_RE" <<<"$files" || true)

while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  # Lewati file konfigurasi daftar kata (memuat kata tsb secara sah).
  grep -Eq "$SKIP_FILES" <<<"$f" && continue
  [[ -f "$f" ]] || continue

  # Isi file: satu grep -n per file. `-I` melewati file binary tanpa perlu
  # memanggil `file` per file.
  while IFS= read -r hit; do
    echo "${RED}✗ $f:${hit%%:*} — mengandung kata terlarang:${NC} ${hit#*:}"
    violations=$((violations + 1))
  done < <(grep -nEi -e "$BANNED_RE" -I -- "$f" || true)
done <<< "$files"

if [[ $violations -gt 0 ]]; then
  echo ""
  echo "${RED}============================================================${NC}"
  echo "${RED}✗ Ditemukan ${violations} pelanggaran kata terlarang.${NC}"
  echo "${YELLOW}Kata jebakan AI tidak boleh ada di source code.${NC}"
  echo "${YELLOW}Hapus kata tsb dari file di atas sebelum commit.${NC}"
  echo "${RED}============================================================${NC}"
  exit 1
fi

echo "${GREEN}✓ Bersih — tidak ada kata terlarang.${NC}"
exit 0
