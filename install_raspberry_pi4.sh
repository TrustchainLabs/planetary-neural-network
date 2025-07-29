#!/bin/bash

# Script de Instalação Automatizada - Smart App Raspberry Pi 4
# Este script instala e configura todo o sistema localmente

set -e

echo "=== Smart App - Instalação Automatizada Raspberry Pi 4 ==="
echo "Este script irá instalar e configurar todo o sistema"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando no Raspberry Pi
check_raspberry_pi() {
    if ! grep -q "Raspberry Pi" /proc/cpuinfo; then
        log_warning "Este script é projetado para Raspberry Pi. Continuar mesmo assim? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_error "Instalação cancelada."
            exit 1
        fi
    fi
}

# Atualizar sistema
update_system() {
    log_info "Atualizando sistema..."
    sudo apt update && sudo apt upgrade -y
    log_success "Sistema atualizado"
}

# Instalar dependências básicas
install_basic_deps() {
    log_info "Instalando dependências básicas..."
    sudo apt install -y curl wget git build-essential python3-pip python3-venv htop
    log_success "Dependências básicas instaladas"
}

# Instalar Node.js
install_nodejs() {
    log_info "Instalando Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Verificar instalação
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log_success "Node.js instalado: $NODE_VERSION, NPM: $NPM_VERSION"
}

# Instalar MongoDB
install_mongodb() {
    log_info "Instalando MongoDB..."
    
    # Importar chave pública
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    
    # Adicionar repositório
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    
    # Instalar
    sudo apt update
    sudo apt install -y mongodb-org
    
    # Iniciar e habilitar
    sudo systemctl start mongod
    sudo systemctl enable mongod
    
    log_success "MongoDB instalado e iniciado"
}

# Instalar Redis
install_redis() {
    log_info "Instalando Redis..."
    sudo apt install -y redis-server
    
    # Configurar persistência
    sudo sed -i 's/# save 900 1/save 900 1/' /etc/redis/redis.conf
    sudo sed -i 's/# save 300 10/save 300 10/' /etc/redis/redis.conf
    sudo sed -i 's/# save 60 10000/save 60 10000/' /etc/redis/redis.conf
    
    # Iniciar e habilitar
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    
    log_success "Redis instalado e iniciado"
}

# Instalar dependências Python
install_python_deps() {
    log_info "Instalando dependências Python..."
    sudo pip3 install psutil requests gpiozero adafruit-circuitpython-dht
    log_success "Dependências Python instaladas"
}

# Configurar scripts Python
setup_python_scripts() {
    log_info "Configurando scripts Python..."
    
    # Copiar scripts
    sudo cp src/modules/pi-health/scripts/pi4_health_monitor.py /usr/local/bin/
    sudo cp src/modules/temperature-sensor/scripts/pi4_dht11_sensor.py /usr/local/bin/
    sudo chmod +x /usr/local/bin/pi4_health_monitor.py
    sudo chmod +x /usr/local/bin/pi4_dht11_sensor.py
    
    # Configurar URLs locais
    sudo sed -i 's|API_BASE_URL = "http://localhost:3000"|API_BASE_URL = "http://localhost:3000"|' /usr/local/bin/pi4_health_monitor.py
    sudo sed -i 's|API_BASE_URL = "http://localhost:3000"|API_BASE_URL = "http://localhost:3000"|' /usr/local/bin/pi4_dht11_sensor.py
    
    log_success "Scripts Python configurados"
}

# Configurar serviços systemd
setup_systemd_services() {
    log_info "Configurando serviços systemd..."
    
    # Serviço do monitor de saúde
    sudo tee /etc/systemd/system/pi4-health-monitor.service > /dev/null <<EOF
[Unit]
Description=Raspberry Pi 4 Health Monitor
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /usr/local/bin/pi4_health_monitor.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Serviço do sensor DHT11
    sudo tee /etc/systemd/system/dht11-sensor.service > /dev/null <<EOF
[Unit]
Description=DHT11 Temperature and Humidity Sensor
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /usr/local/bin/pi4_dht11_sensor.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Recarregar systemd
    sudo systemctl daemon-reload
    
    log_success "Serviços systemd configurados"
}

# Configurar variáveis de ambiente
setup_environment() {
    log_info "Configurando variáveis de ambiente..."
    
    # Criar arquivo .smart_app.env se não existir
    if [ ! -f .smart_app.env ]; then
        cp .smart_app.env.example .smart_app.env 2>/dev/null || {
            # Criar arquivo básico se não existir exemplo
            cat > .smart_app.env <<EOF
# GENERAL CONFIG
NPM_CONFIG_PRODUCTION=false
IS_DEBUG_MODE=true
VALID_DURATION=30
CLUSTERS=0

# HEDERA ENVIRONMENT
NODE_ENV=testnet
CLIENT_ENV=testnet
NETWORK=public
LEDGER=hashgraph

# NESTJS SETTINGS
PORT=3000

# AUTH SECRETS
SESSION_SECRET=your-secret-key-here

# SMART REGISTRY
SMART_REGISTRY_URL='https://testnet-portal.hbarsuite.app'
BASE_URL='https://v2-testnet-sn3.hbarsuite.network'

# MONGO DB (Local)
DEV_MONGO_DB='mongodb://localhost:27017/smart-app'
PROD_MONGO_DB='mongodb://localhost:27017/smart-app'

# REDIS (Local)
REDIS_URL="127.0.0.1"
REDIS_PASSWORD=""
REDIS_PORT="6379"
REDIS_USERNAME="default"
REDIS_DATABASE=0

# TESTNET OPERATOR
DEV_NODE_ID=0.0.5173509
DEV_NODE_PRIVATE_KEY=302e020100300506032b65700422042060062c82f2f6028f7af995ac4642b86e5e9c83f7e9a0b0afdc6bab95486d4b1c
DEV_NODE_PUBLIC_KEY=f8d9de606d07599763b3db9ce6bab780126fdabeec0811ec9a2d8c441c9e315a
EOF
        }
    fi
    
    log_success "Variáveis de ambiente configuradas"
}

# Instalar dependências Node.js
install_node_deps() {
    log_info "Instalando dependências Node.js..."
    npm install
    log_success "Dependências Node.js instaladas"
}

# Compilar projeto
build_project() {
    log_info "Compilando projeto..."
    npm run build
    log_success "Projeto compilado"
}

# Criar script de inicialização
create_startup_script() {
    log_info "Criando script de inicialização..."
    
    sudo tee /usr/local/bin/start-smart-app.sh > /dev/null <<'EOF'
#!/bin/bash

echo "Starting Smart App Services..."

# Start database services
sudo systemctl start mongod
sudo systemctl start redis-server

# Wait for services to be ready
sleep 5

# Start Python monitors
sudo systemctl start pi4-health-monitor
sudo systemctl start dht11-sensor

# Start Node.js backend
cd /home/pi/smart-app
npm run start:prod &

echo "Smart App started successfully!"
EOF

    sudo chmod +x /usr/local/bin/start-smart-app.sh
    log_success "Script de inicialização criado"
}

# Testar instalação
test_installation() {
    log_info "Testando instalação..."
    
    # Verificar serviços
    echo "Verificando serviços..."
    sudo systemctl status mongod --no-pager -l
    sudo systemctl status redis-server --no-pager -l
    
    # Verificar Node.js
    echo "Verificando Node.js..."
    node --version
    npm --version
    
    # Verificar Python
    echo "Verificando Python..."
    python3 --version
    pip3 list | grep -E "(psutil|requests|gpiozero|adafruit)"
    
    log_success "Testes concluídos"
}

# Mostrar informações finais
show_final_info() {
    echo ""
    echo "=== Instalação Concluída! ==="
    echo ""
    echo "Para iniciar o sistema:"
    echo "1. sudo systemctl start mongod"
    echo "2. sudo systemctl start redis-server"
    echo "3. npm run start:prod"
    echo "4. sudo systemctl start pi4-health-monitor"
    echo "5. sudo systemctl start dht11-sensor"
    echo ""
    echo "Ou use o script automático:"
    echo "sudo /usr/local/bin/start-smart-app.sh"
    echo ""
    echo "Para verificar status:"
    echo "- sudo systemctl status pi4-health-monitor"
    echo "- sudo systemctl status dht11-sensor"
    echo "- curl http://localhost:3000/pi-health/health"
    echo ""
    echo "Para ver logs:"
    echo "- sudo journalctl -u pi4-health-monitor -f"
    echo "- sudo journalctl -u dht11-sensor -f"
    echo ""
    echo "Hardware DHT11 (opcional):"
    echo "- GPIO4 (Pin 7) → Data (DHT11)"
    echo "- 3.3V → VCC (DHT11)"
    echo "- GND → GND (DHT11)"
    echo ""
}

# Função principal
main() {
    log_info "Iniciando instalação do Smart App..."
    
    check_raspberry_pi
    update_system
    install_basic_deps
    install_nodejs
    install_mongodb
    install_redis
    install_python_deps
    setup_python_scripts
    setup_systemd_services
    setup_environment
    install_node_deps
    build_project
    create_startup_script
    test_installation
    show_final_info
    
    log_success "Instalação concluída com sucesso!"
}

# Executar função principal
main "$@" 