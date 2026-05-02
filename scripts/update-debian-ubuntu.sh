#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/elternzeugnis}"
APP_USER="${APP_USER:-elternzeugnis}"
SERVICE_USER="${SERVICE_USER:-}"
SERVICE_NAME="${SERVICE_NAME:-elternzeugnis}"
APP_HOST="${APP_HOST:-0.0.0.0}"
APP_PORT="${APP_PORT:-4147}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/elternzeugnis}"
OLD_DEFAULT_HOST="127.0.0.1"
OLD_DEFAULT_PORT="4174"

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
  if ! command -v sqlite3 >/dev/null; then
    log "SQLite installieren"
    apt-get update
    apt-get install -y sqlite3
  fi
}

runtime_user() {
  if [[ -n "${SERVICE_USER}" ]]; then
    printf '%s' "${SERVICE_USER}"
  elif [[ "${APP_DIR}" == "/root" || "${APP_DIR}" == /root/* ]]; then
    printf 'root'
  else
    printf '%s' "${APP_USER}"
  fi
}

prepare_runtime_user() {
  local run_user
  run_user="$(runtime_user)"
  if [[ "${run_user}" != "root" ]] && ! id "${run_user}" >/dev/null 2>&1; then
    useradd --system --home "${APP_DIR}" --shell /usr/sbin/nologin "${run_user}"
  fi
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

env_value() {
  local key="$1"
  if [[ -f "${APP_DIR}/.env" ]]; then
    sed -n "s/^${key}=//p" "${APP_DIR}/.env" | tail -n 1 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
  fi
}

set_env_value() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "${APP_DIR}/.env"; then
    sed -i "s#^${key}=.*#${key}=${value}#" "${APP_DIR}/.env"
  else
    printf '%s=%s\n' "${key}" "${value}" >> "${APP_DIR}/.env"
  fi
}

default_public_url() {
  local server_ip=""
  server_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  if [[ -n "${server_ip}" ]]; then
    printf 'http://%s:%s' "${server_ip}" "${APP_PORT}"
  else
    printf 'http://127.0.0.1:%s' "${APP_PORT}"
  fi
}

validate_port() {
  local value="$1"
  if [[ ! "${value}" =~ ^[0-9]+$ ]] || (( value < 1 || value > 65535 )); then
    fail "Ungültiger Port in .env: ${value}. Bitte PORT=4147 setzen."
  fi
}

ensure_runtime_env() {
  log "Laufzeitkonfiguration prüfen"
  [[ -f "${APP_DIR}/.env" ]] || cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"

  local current_host
  current_host="$(env_value HOST)"
  if [[ -z "${current_host}" || "${current_host}" == "${OLD_DEFAULT_HOST}" || "${current_host}" == "localhost" ]]; then
    set_env_value HOST "${APP_HOST}"
  fi

  local current_port
  current_port="$(env_value PORT)"
  if [[ -z "${current_port}" || "${current_port}" == "${OLD_DEFAULT_PORT}" ]]; then
    set_env_value PORT "${APP_PORT}"
  else
    APP_PORT="${current_port}"
  fi
  validate_port "${APP_PORT}"
  set_env_value PORT "${APP_PORT}"

  local current_url
  current_url="$(env_value APP_URL)"
  if [[ -z "${current_url}" || "${current_url}" == "http://127.0.0.1:5173" || "${current_url}" == "http://127.0.0.1:${OLD_DEFAULT_PORT}" ]]; then
    set_env_value APP_URL "${PUBLIC_URL:-$(default_public_url)}"
  fi
}

build_app() {
  log "Abhängigkeiten aktualisieren und App bauen"
  npm --prefix "${APP_DIR}" ci
  npm --prefix "${APP_DIR}" run build
  mkdir -p "${APP_DIR}/data"
  local run_user
  run_user="$(runtime_user)"
  chown -R "${run_user}:${run_user}" "${APP_DIR}"
}

write_service() {
  log "systemd-Service aktualisieren"
  local run_user
  run_user="$(runtime_user)"
  cat >"/etc/systemd/system/${SERVICE_NAME}.service" <<SERVICE
[Unit]
Description=Elternzeugnis
After=network.target

[Service]
Type=simple
User=${run_user}
Group=${run_user}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
ExecStart=/usr/bin/node ${APP_DIR}/server/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

  systemctl daemon-reload
  systemctl enable "${SERVICE_NAME}" >/dev/null
}

restart_service() {
  log "Service neu starten"
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
  local server_ip=""
  server_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  printf '\n\nUpdate fertig. Lokal auf dem Server: http://127.0.0.1:%s/\n' "${APP_PORT}"
  if [[ -n "${server_ip}" ]]; then
    printf 'Im Netzwerk erreichbar unter: http://%s:%s/\n' "${server_ip}" "${APP_PORT}"
  fi
}

main() {
  need_root "$@"
  check_installation
  prepare_runtime_user
  backup_data
  update_code
  ensure_runtime_env
  build_app
  write_service
  restart_service
  verify_update
}

main "$@"
