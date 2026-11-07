#!/usr/bin/env bash
# Liga o backup ao Google Drive (BEYOND-0003). Rodar UMA vez, num terminal ABERTO NA ÁREA DE
# TRABALHO do servidor local (não por SSH): o rclone abre o navegador para você entrar na conta Google e
# clicar em "Permitir".
#
# Permissão pedida: `drive.file` — o rclone só enxerga os arquivos que ELE criou. O resto do
# seu Drive fica invisível para ele. E o Google só recebe arquivos já cifrados, com nome
# embaralhado (a criptografia, remote lisa-bkp-cripto, já está configurada).
#
# Os backups ficam na pasta `lisa-backup` da raiz do Drive.

set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

rclone listremotes | grep -q '^lisa-bkp-cripto:$' || { echo "falta o remote lisa-bkp-cripto (ver LEIA-ME.md)"; exit 1; }

echo "Vai abrir o navegador: entre na conta Google que vai guardar os backups e clique em Permitir."
echo "(Se o navegador não abrir sozinho, copie o endereço http://127.0.0.1:53682/... que aparecer abaixo.)"
echo

umask 077
rclone config delete lisa-bkp > /dev/null 2>&1 || true
rclone config create lisa-bkp drive scope=drive.file

echo
echo "Conferindo o acesso..."
rclone mkdir lisa-bkp:lisa-backup
rclone mkdir lisa-bkp-cripto:semanal
rclone about lisa-bkp: 2>/dev/null | sed 's/^/  /' || true

echo
echo "Google Drive ligado. Rodando o primeiro backup agora (leva uns 3 minutos)..."
~/backup/backup.sh semanal | tee -a ~/backup/backup.log
echo
cat ~/backup/ultimo-semanal.json
