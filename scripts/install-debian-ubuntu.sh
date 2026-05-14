#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/Schello805/Elternzeugnis.git}"
APP_DIR="${APP_DIR:-/opt/elternzeugnis}"
APP_USER="${APP_USER:-elternzeugnis}"
SERVICE_USER="${SERVICE_USER:-}"
SERVICE_NAME="${SERVICE_NAME:-elternzeugnis}"
APP_HOST="${APP_HOST:-0.0.0.0}"
APP_PORT="${APP_PORT:-80}"
PUBLIC_URL="${PUBLIC_URL:-}"
NODE_MAJOR="${NODE_MAJOR:-20}"

log() {
  printf '\n\033[1;32m==>\033[0m %s\n' "$*"
}

fail() {
  printf '\n\033[1;31mFehler:\033[0m %s\n' "$*" >&2
  exit 1
}

url_for_host() {
  local host="$1"
  if [[ "${APP_PORT}" == "80" ]]; then
    printf 'http://%s/' "${host}"
  else
    printf 'http://%s:%s/' "${host}" "${APP_PORT}"
  fi
}

default_local_url() {
  if [[ "${APP_PORT}" == "80" ]]; then
    printf 'http://127.0.0.1'
  else
    printf 'http://127.0.0.1:%s' "${APP_PORT}"
  fi
}

need_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    exec sudo -E bash "$0" "$@"
  fi
}

check_system() {
  [[ -r /etc/os-release ]] || fail "Dieses Skript benötigt Debian oder Ubuntu."
  # shellcheck disable=SC1091
  source /etc/os-release
  case "${ID:-}" in
    debian|ubuntu) ;;
    *) fail "Nicht unterstütztes System: ${PRETTY_NAME:-unbekannt}. Unterstützt werden Debian und Ubuntu." ;;
  esac
  command -v systemctl >/dev/null || fail "systemd wurde nicht gefunden."
}

install_packages() {
  log "Systempakete installieren"
  apt-get update
  apt-get install -y ca-certificates curl git build-essential sqlite3
}

install_node() {
  local current_major=""
  if command -v node >/dev/null; then
    current_major="$(node -p 'process.versions.node.split(".")[0]')"
  fi

  if [[ "${current_major}" == "${NODE_MAJOR}" || "${current_major}" -gt "${NODE_MAJOR}" ]]; then
    log "Node.js $(node --version) ist vorhanden"
    return
  fi

  log "Node.js ${NODE_MAJOR}.x installieren"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
}

prepare_user() {
  log "Systembenutzer vorbereiten"
  local run_user
  run_user="$(runtime_user)"
  if [[ "${run_user}" != "root" ]] && ! id "${run_user}" >/dev/null 2>&1; then
    useradd --system --home "${APP_DIR}" --shell /usr/sbin/nologin "${run_user}"
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

checkout_repo() {
  log "Repository bereitstellen"
  git config --global --add safe.directory "${APP_DIR}" >/dev/null 2>&1 || true
  if [[ -d "${APP_DIR}/.git" ]]; then
    git -C "${APP_DIR}" fetch origin main
    git -C "${APP_DIR}" checkout main
    git -C "${APP_DIR}" pull --ff-only origin main
  elif [[ -e "${APP_DIR}" && -n "$(find "${APP_DIR}" -mindepth 1 -maxdepth 1 2>/dev/null)" ]]; then
    fail "${APP_DIR} existiert und ist nicht leer. Bitte APP_DIR anders setzen oder den Ordner prüfen."
  else
    mkdir -p "$(dirname "${APP_DIR}")"
    git clone "${REPO_URL}" "${APP_DIR}"
  fi
}

configure_env() {
  log "Konfiguration vorbereiten"
  if [[ -z "${PUBLIC_URL}" ]]; then
    PUBLIC_URL="$(default_local_url)"
  fi

  if [[ ! -f "${APP_DIR}/.env" ]]; then
    cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  fi

  if grep -q '^PORT=' "${APP_DIR}/.env"; then
    sed -i "s/^PORT=.*/PORT=${APP_PORT}/" "${APP_DIR}/.env"
  else
    printf '\nPORT=%s\n' "${APP_PORT}" >> "${APP_DIR}/.env"
  fi

  if grep -q '^HOST=' "${APP_DIR}/.env"; then
    sed -i "s/^HOST=.*/HOST=${APP_HOST}/" "${APP_DIR}/.env"
  else
    printf 'HOST=%s\n' "${APP_HOST}" >> "${APP_DIR}/.env"
  fi

  if grep -q '^APP_URL=' "${APP_DIR}/.env"; then
    sed -i "s#^APP_URL=.*#APP_URL=${PUBLIC_URL}#" "${APP_DIR}/.env"
  else
    printf 'APP_URL=%s\n' "${PUBLIC_URL}" >> "${APP_DIR}/.env"
  fi
}

build_app() {
  log "Abhängigkeiten installieren und App bauen"
  npm --prefix "${APP_DIR}" ci
  npm --prefix "${APP_DIR}" run build
}

install_service() {
  log "systemd-Service einrichten"
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
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
SERVICE

  mkdir -p "${APP_DIR}/data"
  chown -R "${run_user}:${run_user}" "${APP_DIR}"
  systemctl daemon-reload
  systemctl enable "${SERVICE_NAME}"
  systemctl restart "${SERVICE_NAME}"
}

verify_installation() {
  log "Installation prüfen"
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
  node --version
  npm --version
  cat /tmp/elternzeugnis-health.json
  local server_ip=""
  server_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  printf '\n\nFertig. Lokal auf dem Server: %s\n' "$(url_for_host 127.0.0.1)"
  if [[ -n "${server_ip}" ]]; then
    printf 'Im Netzwerk erreichbar unter: %s\n' "$(url_for_host "${server_ip}")"
  fi
}

main() {
  need_root "$@"
  check_system
  install_packages
  install_node
  prepare_user
  checkout_repo
  configure_env
  build_app
  install_service
  verify_installation
}

main "$@"
