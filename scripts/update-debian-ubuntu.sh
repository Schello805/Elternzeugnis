#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/elternzeugnis}"
APP_USER="${APP_USER:-elternzeugnis}"
SERVICE_NAME="${SERVICE_NAME:-elternzeugnis}"
APP_PORT="${APP_PORT:-4174}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/elternzeugnis}"

log() {
  printf '\n\033[1;32m==>\033[0m %s\n' "$*"
}

fail() {
  printf '\n\033[1;31mFehler:\033[0m %s\n' "$*" >&2
  exit 1
}

need_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    exec sudo -E bash "$0" "$@"
  fi
}

check_installation() {
  [[ -d "${APP_DIR}/.git" ]] || fail "${APP_DIR} ist kein Git-Checkout. Bitte zuerst install-debian-ubuntu.sh ausführen."
  command -v systemctl >/dev/null || fail "systemd wurde nicht gefunden."
  command -v npm >/dev/null || fail "npm wurde nicht gefunden."
}

backup_data() {
  log "Daten sichern"
  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  local target="${BACKUP_DIR}/${stamp}"
  mkdir -p "${target}"
  [[ -f "${APP_DIR}/.env" ]] && cp "${APP_DIR}/.env" "${target}/.env"
  [[ -d "${APP_DIR}/data" ]] && cp -a "${APP_DIR}/data" "${target}/data"
  printf 'Backup: %s\n' "${target}"
}

update_code() {
  log "Repository aktualisieren"
  git config --global --add safe.directory "${APP_DIR}" >/dev/null 2>&1 || true
  git -C "${APP_DIR}" fetch origin main
  git -C "${APP_DIR}" checkout main
  git -C "${APP_DIR}" pull --ff-only origin main
}

build_app() {
  log "Abhängigkeiten aktualisieren und App bauen"
  npm --prefix "${APP_DIR}" ci
  npm --prefix "${APP_DIR}" run build
  mkdir -p "${APP_DIR}/data"
  chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
}

restart_service() {
  log "Service neu starten"
  systemctl daemon-reload
  systemctl restart "${SERVICE_NAME}"
}

verify_update() {
  log "Update prüfen"
  systemctl is-active --quiet "${SERVICE_NAME}" || {
    systemctl status "${SERVICE_NAME}" --no-pager || true
    fail "Service ${SERVICE_NAME} läuft nicht."
  }

  for _ in {1..30}; do
    if curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/tmp/elternzeugnis-health.json; then
      break
    fi
    sleep 1
  done

  curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null || fail "Healthcheck fehlgeschlagen."
  curl -fsSI "http://127.0.0.1:${APP_PORT}/" >/dev/null || fail "Frontend ist nicht erreichbar."
  cat /tmp/elternzeugnis-health.json
  printf '\n\nUpdate fertig. Elternzeugnis läuft unter: http://127.0.0.1:%s/\n' "${APP_PORT}"
}

main() {
  need_root "$@"
  check_installation
  backup_data
  update_code
  build_app
  restart_service
  verify_update
}

main "$@"
