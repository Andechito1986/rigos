#!/bin/bash
# =============================================================================
# RIG.OS - Master Installation Script
# =============================================================================
# Usage:   sudo bash install-rig.sh
# Target:  Ubuntu Server 24.04 LTS (headless)
# Hardware: 4x GTX 1660 Super + 1x RTX 3070, SSD USB 512GB
# Network:  Static IP 172.16.16.70/24, Gateway 172.16.16.1
# =============================================================================

set -euo pipefail

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# ─── Config ─────────────────────────────────────────────────────────────────
RIG_IP="172.16.16.70"
RIG_GATEWAY="172.16.16.1"
RIG_NETMASK="24"
RIG_DNS="8.8.8.8,1.1.1.1"
RIG_USER="rig"
RIG_HOSTNAME="rig-os-mining"
NETWORK_INTERFACE=""  # Auto-detected
API_PORT=3001
WEB_PORT=8080

# ─── Helpers ────────────────────────────────────────────────────────────────
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
step() { echo -e "\n${BOLD}${CYAN}=== $1 ===${NC}\n"; }

check_root() {
  if [[ $EUID -ne 0 ]]; then
    err "Este script debe ejecutarse como root. Usa: sudo bash install-rig.sh"
    exit 1
  fi
}

detect_network_interface() {
  NETWORK_INTERFACE=$(ip -o link show | awk -F': ' '/^[0-9]+: (en|eth)/ {print $2; exit}')
  if [[ -z "$NETWORK_INTERFACE" ]]; then
    NETWORK_INTERFACE=$(ip -o link show | awk -F': ' '/^[0-9]+: / && $2 != "lo" {print $2; exit}')
  fi
  if [[ -z "$NETWORK_INTERFACE" ]]; then
    err "No se pudo detectar interfaz de red. Configura manualmente en /etc/netplan/"
    exit 1
  fi
  info "Interfaz de red detectada: $NETWORK_INTERFACE"
}

# ─── Main ───────────────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${CYAN}"
echo "  ____  ____  _____ ____   ___  ____"
echo " |  _ \\|  _ \\| ____/ ___| / _ \\/ ___|"
echo " | |_) | |_) |  _| \\___ \\| | | \\___ \\"
echo " |  _ <|  __/| |___ ___) | |_| |___) |"
echo " |_| \\_\\_|   |_____|____/ \\___/|____/"
echo -e "${NC}"
echo -e "${BOLD}  Instalador v1.0 | Rig: ${RIG_HOSTNAME} | IP: ${RIG_IP}${NC}"
echo ""

check_root
info "Iniciando instalacion... Tiempo estimado: 15-25 minutos"
sleep 2

# ─── Step 1: System Validation ──────────────────────────────────────────────
step "Paso 1/10: Validacion del sistema"

if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
  warn "No se detecto Ubuntu. Este script esta diseñado para Ubuntu Server 24.04"
  read -p "¿Continuar de todos modos? (s/N): " -n 1 -r
  echo
  [[ $REPLY =~ ^[Ss]$ ]] || exit 1
fi

UBUNTU_VERSION=$(grep VERSION_ID /etc/os-release | cut -d'"' -f2)
info "Version detectada: Ubuntu $UBUNTU_VERSION"

# Update system
info "Actualizando paquetes del sistema..."
apt update -y
DEBIAN_FRONTEND=noninteractive apt upgrade -y
ok "Sistema actualizado"

# ─── Step 2: Hostname ───────────────────────────────────────────────────────
step "Paso 2/10: Configuracion basica"

info "Configurando hostname: $RIG_HOSTNAME"
hostnamectl set-hostname "$RIG_HOSTNAME"
echo "127.0.1.1 $RIG_HOSTNAME" >> /etc/hosts
ok "Hostname configurado"

# Create rig user if doesn't exist
if ! id "$RIG_USER" &>/dev/null; then
  info "Creando usuario: $RIG_USER"
  useradd -m -s /bin/bash -G sudo,docker "$RIG_USER" 2>/dev/null || useradd -m -s /bin/bash -G sudo "$RIG_USER"
  echo "$RIG_USER:$RIG_USER" | chpasswd
  ok "Usuario $RIG_USER creado (password: $RIG_USER - CAMBIALO DESPUES)"
else
  info "Usuario $RIG_USER ya existe"
fi

# ─── Step 3: Network (Static IP) ────────────────────────────────────────────
step "Paso 3/10: Configuracion de red estatica"

detect_network_interface

cat > /etc/netplan/00-rig-os.yaml <<EOF
network:
  version: 2
  ethernets:
    ${NETWORK_INTERFACE}:
      dhcp4: no
      addresses:
        - ${RIG_IP}/${RIG_NETMASK}
      routes:
        - to: default
          via: ${RIG_GATEWAY}
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1
EOF

chmod 600 /etc/netplan/00-rig-os.yaml
netplan apply
sleep 2
CURRENT_IP=$(ip -4 addr show "$NETWORK_INTERFACE" | grep -oP '(?<=inet\s)\d+(\.\d+){3}')
ok "IP configurada: $CURRENT_IP (deberia ser $RIG_IP)"

# ─── Step 4: Packages ───────────────────────────────────────────────────────
step "Paso 4/10: Instalando paquetes esenciales"

PACKAGES=(
  curl wget git htop tmux
  lm-sensors ncdu unzip
  nginx
  xorg openbox unclutter
  fonts-inter
  ufw
  software-properties-common
  ubuntu-drivers-common
)

info "Instalando paquetes base (${#PACKAGES[@]} paquetes)..."
DEBIAN_FRONTEND=noninteractive apt install -y "${PACKAGES[@]}" 2>/dev/null || {
  warn "Algunos paquetes no se instalaron, intentando sin los opcionales..."
  DEBIAN_FRONTEND=noninteractive apt install -y curl wget git htop tmux nginx xorg openbox ufw
}
ok "Paquetes base instalados"

# Node.js (LTS)
info "Instalando Node.js LTS..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
ok "Node.js $(node --version) instalado"

# Docker
info "Instalando Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "$RIG_USER"
fi
ok "Docker instalado"

# ─── Step 5: NVIDIA Drivers ─────────────────────────────────────────────────
step "Paso 5/10: Instalando drivers NVIDIA"

info "Detectando GPUs NVIDIA..."
lspci | grep -i nvidia || warn "No se detectaron GPUs NVIDIA via lspci"

info "Instalando driver NVIDIA (esto puede tardar varios minutos)..."

# Try recommended driver first
if ubuntu-drivers devices 2>/dev/null | grep -q nvidia; then
  info "Instalando driver recomendado por ubuntu-drivers..."
  ubuntu-drivers install --gpgpu || {
    warn "Fallo el driver recomendado, intentando nvidia-driver-550-server..."
    apt install -y nvidia-driver-550-server || {
      warn "Fallo 550-server, intentando nvidia-driver-535-server..."
      apt install -y nvidia-driver-535-server || {
        err "No se pudo instalar ningun driver NVIDIA. Instala manualmente."
        exit 1
      }
    }
  }
else
  warn "ubuntu-drivers no detecto GPUs. Intentando instalacion directa..."
  apt install -y nvidia-driver-550-server || apt install -y nvidia-driver-535-server || {
    err "No se pudo instalar driver NVIDIA"
    exit 1
  }
fi

# nvidia-persistenced for headless mode
info "Configurando nvidia-persistenced (modo headless)..."
systemctl enable nvidia-persistenced 2>/dev/null || true
ok "Drivers NVIDIA instalados. Se requiere REBOOT al final."

# ─── Step 6: RIG.OS Application ─────────────────────────────────────────────
step "Paso 6/10: Instalando RIG.OS"

# Setup directories
info "Creando directorios..."
mkdir -p /var/www/rigos
mkdir -p /opt/rigos-api
chown "$RIG_USER:$RIG_USER" /var/www/rigos
chown "$RIG_USER:$RIG_USER" /opt/rigos-api
ok "Directorios creados"

# Copy frontend files (assumes install-rig.sh is run from the repo)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

if [[ -d "$REPO_DIR/dist" ]]; then
  info "Copiando frontend desde $REPO_DIR/dist..."
  cp -r "$REPO_DIR/dist/"* /var/www/rigos/
  ok "Frontend copiado"
elif [[ -d "$REPO_DIR/build" ]]; then
  info "Copiando frontend desde $REPO_DIR/build..."
  cp -r "$REPO_DIR/build/"* /var/www/rigos/
  ok "Frontend copiado"
else
  warn "No se encontro carpeta dist/ ni build/. Copia manualmente los archivos del build a /var/www/rigos/"
  warn "Ubicacion esperada: $REPO_DIR/dist/"
fi

# Install API
if [[ -f "$REPO_DIR/api/server.js" ]]; then
  info "Instalando API backend..."
  cp "$REPO_DIR/api/server.js" /opt/rigos-api/
  cp "$REPO_DIR/api/package.json" /opt/rigos-api/ 2>/dev/null || true
  cd /opt/rigos-api
  npm install --production
  chown -R "$RIG_USER:$RIG_USER" /opt/rigos-api
  ok "API instalada en /opt/rigos-api"
else
  warn "No se encontro api/server.js. La API debera instalarse manualmente."
fi

# ─── Step 7: Services ───────────────────────────────────────────────────────
step "Paso 7/10: Configurando servicios"

# nginx config
cat > /etc/nginx/sites-available/rigos <<'NGINX_EOF'
server {
    listen 8080 default_server;
    listen [::]:8080 default_server;
    server_name _;

    root /var/www/rigos;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/rigos /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx && systemctl enable nginx
ok "nginx configurado en puerto 8080"

# RIG.OS API systemd service
cat > /etc/systemd/system/rigos-api.service <<'SERVICE_EOF'
[Unit]
Description=RIG.OS GPU Monitoring API
After=network-online.target nvidia-persistenced.service
Wants=network-online.target

[Service]
Type=simple
User=rig
WorkingDirectory=/opt/rigos-api
ExecStart=/usr/bin/node /opt/rigos-api/server.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=3001"

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/rigos
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable rigos-api
ok "Servicio rigos-api configurado"

# ─── Step 8: Firewall ───────────────────────────────────────────────────────
step "Paso 8/10: Configurando firewall"

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 8080/tcp comment 'RIG.OS Web UI'
ufw allow 3001/tcp comment 'RIG.OS API' 2>/dev/null || true
ufw --force enable
ok "Firewall UFW activado (puertos: 22, 8080)"

# ─── Step 9: Kiosk Mode (8" Display) ────────────────────────────────────────
step "Paso 9/10: Configurando modo kiosk (pantalla 8\")"

# Auto-login on tty1
tee /etc/systemd/system/getty@tty1.service.d/override.conf <<'AUTOLOGIN_EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin rig --noclear %I $TERM
AUTOLOGIN_EOF

systemctl daemon-reload

# .bash_profile auto-start X on tty1
tee /home/$RIG_USER/.bash_profile <<'BASH_EOF'
# Auto-start RIG.OS display on tty1
if [[ "$(tty)" == "/dev/tty1" ]]; then
  exec startx
fi
BASH_EOF

# .xinitrc - Openbox + Chromium kiosk
tee /home/$RIG_USER/.xinitrc <<'XINIT_EOF'
#!/bin/bash
# Disable screen blanking
xset -dpms
xset s off
xset s noblank

# Hide cursor after 1 second of inactivity
unclutter -idle 1 -root &

# Start Openbox
openbox-session &

# Launch RIG.OS in kiosk mode
sleep 2
exec chromium-browser \
  --kiosk \
  --app="http://localhost:8080/?mode=display" \
  --no-first-run \
  --no-default-browser-check \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --password-store=basic \
  --force-device-scale-factor=1.2 \
  --window-size=800,480 \
  --window-position=0,0 \
  --disable-extensions \
  --disable-plugins \
  --disable-sync \
  --disable-web-security \
  --user-data-dir=/tmp/chromium-rigos
XINIT_EOF

chmod +x /home/$RIG_USER/.xinitrc
chown -R "$RIG_USER:$RIG_USER" /home/$RIG_USER/.bash_profile /home/$RIG_USER/.xinitrc

# Openbox autostart for rig user (fallback)
mkdir -p /home/$RIG_USER/.config/openbox
tee /home/$RIG_USER/.config/openbox/autostart <<'OB_EOF'
# RIG.OS Kiosk autostart
/home/rig/.xinitrc &
OB_EOF
chown -R "$RIG_USER:$RIG_USER" /home/$RIG_USER/.config

ok "Modo kiosk configurado (arranca automaticamente en la pantalla de 8\")"

# ─── Step 10: Update Script ─────────────────────────────────────────────────
step "Paso 10/10: Scripts de utilidad"

# rigos-update command
tee /usr/local/bin/rigos-update <<'UPDATE_EOF'
#!/bin/bash
# RIG.OS Update Script
# Usage: rigos-update [usb|git|status]

set -e

LOG_FILE="/var/log/rigos-update.log"
RIG_DIR="/var/www/rigos"
API_DIR="/opt/rigos-api"
USB_MOUNT="/mnt/usb"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

update_usb() {
  log "Buscando actualizacion en USB..."
  for dev in /dev/sd*1; do
    [[ -e "$dev" ]] || continue
    mountpoint -q "$USB_MOUNT" && umount "$USB_MOUNT" 2>/dev/null || true
    mkdir -p "$USB_MOUNT"
    if mount "$dev" "$USB_MOUNT" 2>/dev/null; then
      if [[ -d "$USB_MOUNT/rigos-update" ]]; then
        log "Actualizacion encontrada en $dev"
        cp -r "$USB_MOUNT/rigos-update/"* "$RIG_DIR/"
        [[ -d "$USB_MOUNT/rigos-update/api" ]] && cp -r "$USB_MOUNT/rigos-update/api/"* "$API_DIR/"
        systemctl restart nginx rigos-api
        log "Actualizacion completada desde USB"
        umount "$USB_MOUNT"
        return 0
      fi
      umount "$USB_MOUNT" 2>/dev/null || true
    fi
  done
  log "No se encontro actualizacion en USB"
  return 1
}

update_git() {
  log "Actualizando via git..."
  cd "$RIG_DIR"
  if [[ -d .git ]]; then
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || {
      log "ERROR: git pull fallo"
      return 1
    }
    systemctl restart nginx
    log "Frontend actualizado via git"
  else
    log "WARN: $RIG_DIR no es un repo git"
    return 1
  fi
  
  cd "$API_DIR"
  if [[ -d .git ]]; then
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
    npm install --production 2>/dev/null || true
    systemctl restart rigos-api
    log "API actualizada via git"
  fi
}

show_status() {
  echo "=== RIG.OS Status ==="
  echo "nginx:     $(systemctl is-active nginx)"
  echo "rigos-api: $(systemctl is-active rigos-api)"
  echo "nvidia:    $(systemctl is-active nvidia-persistenced 2>/dev/null || echo 'n/a')"
  echo ""
  echo "IP:        $(hostname -I | awk '{print $1}')"
  echo "Uptime:    $(uptime -p)"
  echo "GPU:       $(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | wc -l) GPUs detectadas"
  echo ""
  echo "URLs:"
  echo "  Web UI:  http://$(hostname -I | awk '{print $1}'):8080"
  echo "  API:     http://$(hostname -I | awk '{print $1}'):3001/api/health"
}

case "${1:-status}" in
  usb) update_usb ;;
  git) update_git ;;
  status) show_status ;;
  *) echo "Uso: rigos-update [usb|git|status]" ;;
esac
UPDATE_EOF

chmod +x /usr/local/bin/rigos-update

# Create data directory for API
mkdir -p /var/lib/rigos
chown "$RIG_USER:$RIG_USER" /var/lib/rigos
chmod 755 /var/lib/rigos

ok "Scripts de utilidad instalados"

# ─── Summary ────────────────────────────────────────────────────────────────
step "Instalacion completada!"

echo -e "\n${GREEN}${BOLD}  RIG.OS se instalo correctamente!${NC}\n"
echo -e "  ${BOLD}IP estatica:${NC}    ${RIG_IP}"
echo -e "  ${BOLD}Hostname:${NC}       ${RIG_HOSTNAME}"
echo -e "  ${BOLD}Usuario:${NC}        ${RIG_USER}"
echo -e ""
echo -e "  ${BOLD}Acceso Web UI:${NC}  ${CYAN}http://${RIG_IP}:8080${NC}"
echo -e "  ${BOLD}Acceso SSH:${NC}     ${CYAN}ssh ${RIG_USER}@${RIG_IP}${NC}"
echo -e "  ${BOLD}API Health:${NC}     ${CYAN}http://${RIG_IP}:3001/api/health${NC}"
echo -e "  ${BOLD}Display 8\":${NC}     ${CYAN}http://${RIG_IP}:8080/?mode=display${NC}"
echo -e ""
echo -e "  ${BOLD}Comandos utiles:${NC}"
echo -e "    rigos-update status   - Ver estado del sistema"
echo -e "    rigos-update usb      - Actualizar desde pendrive USB"
echo -e "    nvidia-smi            - Ver estado de las GPUs"
echo -e "    sudo systemctl status rigos-api  - Estado del API"
echo -e ""
echo -e "  ${YELLOW}${BOLD}IMPORTANTE: Reinicia el sistema para activar los drivers NVIDIA${NC}"
echo -e "  ${YELLOW}Ejecuta: sudo reboot${NC}\n"

read -p "¿Reiniciar ahora? (s/N): " -n 1 -r
echo
[[ $REPLY =~ ^[Ss]$ ]] && reboot
