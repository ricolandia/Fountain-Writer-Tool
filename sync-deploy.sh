#!/usr/bin/env bash
# Sincroniza web/ → deploy/ (cópia estática publicada em
# ricolandia.com/editor-roteiros-gratuito/Demo/).
#
# - Não usa --delete: o deploy tem arquivos próprios do site
#   (imagens/, .htaccess, LANDING.md, webp de screenshots...) que não
#   existem em web/ e não podem ser apagados.
# - Arquivos de desenvolvimento (tests, server.py, Dockerfile...) ficam
#   fora do deploy.
# - Limpa resquícios antigos de dev (tests/tests/, __pycache__, bundle
#   removido) para não subir lixo.
#
# Uso: ./sync-deploy.sh  (depois, suba a pasta deploy/ para o servidor)
set -euo pipefail
cd "$(dirname "$0")"

rsync -av \
  --exclude 'tests/' \
  --exclude '__pycache__/' \
  --exclude 'server.py' \
  --exclude 'fountain_utils.py' \
  --exclude 'docker-compose.yml' \
  --exclude 'Dockerfile' \
  --exclude 'test-excalidraw.html' \
  web/ deploy/

rm -rf deploy/tests deploy/__pycache__ deploy/js/codemirror-fountain.js

echo
echo "✅ deploy/ sincronizado. Suba a pasta deploy/ para o servidor (FTP/scp)."
