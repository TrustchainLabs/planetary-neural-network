# Guia Completo: Rodando o Smart-App Localmente no Raspberry Pi 4

## 🎯 Visão Geral

Este guia mostra como configurar e rodar todo o sistema smart-app localmente no Raspberry Pi 4, incluindo:
- Backend NestJS
- Monitor de saúde do Pi
- Sensor DHT11 (opcional)
- Machine Learning
- Banco de dados MongoDB
- Cache Redis

## 📋 Pré-requisitos

### Hardware Necessário:
- ✅ Raspberry Pi 4 (4GB RAM recomendado)
- ✅ MicroSD 32GB+ (Class 10)
- ✅ Fonte de alimentação 5V/3A
- ✅ Sensor DHT11 (opcional)
- ✅ Cabos jumper (se usar DHT11)

### Software Base:
- ✅ Raspberry Pi OS (Bullseye ou mais recente)
- ✅ Node.js 18+ 
- ✅ Python 3.8+
- ✅ Git

## 🚀 Instalação Passo a Passo

### 1. Preparação Inicial do Raspberry Pi

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git build-essential python3-pip python3-venv

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalações
node --version  # Deve ser 18+
npm --version
python3 --version
```

### 2. Instalar MongoDB

```bash
# Importar chave pública do MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Adicionar repositório MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Instalar MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Iniciar e habilitar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar status
sudo systemctl status mongod
```

### 3. Instalar Redis

```bash
# Instalar Redis
sudo apt install -y redis-server

# Configurar Redis para persistência
sudo sed -i 's/# save 900 1/save 900 1/' /etc/redis/redis.conf
sudo sed -i 's/# save 300 10/save 300 10/' /etc/redis/redis.conf
sudo sed -i 's/# save 60 10000/save 60 10000/' /etc/redis/redis.conf

# Iniciar e habilitar Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verificar status
sudo systemctl status redis-server
```

### 4. Clonar e Configurar o Projeto

```bash
# Clonar o projeto
git clone <URL_DO_SEU_REPOSITORIO> smart-app
cd smart-app

# Instalar dependências Node.js
npm install

# Verificar se todas as dependências foram instaladas
npm list --depth=0
```

### 5. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de configuração
cp .smart_app.env.example .smart_app.env

# Editar configurações para ambiente local
nano .smart_app.env
```

**Configuração para ambiente local:**

```env
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
```

### 6. Instalar Scripts Python

```bash
# Instalar dependências Python
sudo pip3 install psutil requests gpiozero adafruit-circuitpython-dht

# Copiar scripts para /usr/local/bin
sudo cp src/modules/pi-health/scripts/pi4_health_monitor.py /usr/local/bin/
sudo cp src/modules/temperature-sensor/scripts/pi4_dht11_sensor.py /usr/local/bin/
sudo chmod +x /usr/local/bin/pi4_health_monitor.py
sudo chmod +x /usr/local/bin/pi4_dht11_sensor.py

# Configurar URLs locais nos scripts
sudo nano /usr/local/bin/pi4_health_monitor.py
sudo nano /usr/local/bin/pi4_dht11_sensor.py
```

**Editar URLs nos scripts Python:**

```python
# Em pi4_health_monitor.py
API_BASE_URL = "http://localhost:3000"  # URL local
DEVICE_ID = "pi4-device-001"

# Em pi4_dht11_sensor.py  
API_BASE_URL = "http://localhost:3000"  # URL local
DEVICE_ID = "pi4-dht11-001"
```

### 7. Configurar Serviços Systemd

```bash
# Criar serviço do monitor de saúde
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

# Criar serviço do sensor DHT11 (se aplicável)
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
```

### 8. Configurar Hardware (DHT11 - Opcional)

Se você tiver um sensor DHT11:

```bash
# Conectar hardware:
# GPIO4 (Pin 7) → Data (DHT11)
# 3.3V → VCC (DHT11)  
# GND → GND (DHT11)

# Testar sensor
sudo python3 /usr/local/bin/pi4_dht11_sensor.py
```

### 9. Iniciar o Sistema

```bash
# 1. Iniciar serviços de banco
sudo systemctl start mongod
sudo systemctl start redis-server

# 2. Compilar e iniciar o backend
npm run build
npm run start:prod

# 3. Em outro terminal, iniciar monitor de saúde
sudo systemctl start pi4-health-monitor

# 4. Se tiver DHT11, iniciar sensor
sudo systemctl start dht11-sensor
```

## 🧪 Testes e Verificação

### 1. Verificar Status dos Serviços

```bash
# Verificar MongoDB
sudo systemctl status mongod

# Verificar Redis
sudo systemctl status redis-server

# Verificar monitor de saúde
sudo systemctl status pi4-health-monitor

# Verificar sensor DHT11 (se aplicável)
sudo systemctl status dht11-sensor
```

### 2. Testar API

```bash
# Health check
curl http://localhost:3000/pi-health/health
curl http://localhost:3000/dht11-sensor/health

# Testar endpoints
curl -X POST http://localhost:3000/pi-health/mock/reading
curl -X POST http://localhost:3000/dht11-sensor/mock/reading

# Ver dados
curl http://localhost:3000/pi-health/readings/latest/pi4-device-001
curl http://localhost:3000/dht11-sensor/readings/latest/pi4-dht11-001
```

### 3. Verificar Logs

```bash
# Logs do backend
tail -f logs/app.log

# Logs do monitor de saúde
sudo journalctl -u pi4-health-monitor -f

# Logs do sensor DHT11
sudo journalctl -u dht11-sensor -f

# Logs do MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Logs do Redis
sudo tail -f /var/log/redis/redis-server.log
```

## 📊 Monitoramento

### 1. Dashboard Local

Acesse no navegador:
- **API Health**: http://localhost:3000/pi-health/health
- **DHT11 Health**: http://localhost:3000/dht11-sensor/health
- **Device Status**: http://localhost:3000/pi-health/status/pi4-device-001

### 2. Métricas em Tempo Real

```bash
# Ver última leitura de saúde
curl http://localhost:3000/pi-health/readings/latest/pi4-device-001 | jq

# Ver estatísticas
curl http://localhost:3000/pi-health/stats/pi4-device-001 | jq

# Ver recomendações
curl http://localhost:3000/pi-health/recommendations/pi4-device-001 | jq
```

### 3. Machine Learning Status

```bash
# Status do ML
curl http://localhost:3000/pi-health/ml/status | jq

# Status do ML de temperatura
curl http://localhost:3000/temperature-sensor/ml/status | jq
```

## 🔧 Troubleshooting

### Problemas Comuns:

1. **MongoDB não inicia**:
```bash
sudo systemctl status mongod
sudo journalctl -u mongod -f
```

2. **Redis não inicia**:
```bash
sudo systemctl status redis-server
sudo journalctl -u redis-server -f
```

3. **Scripts Python não funcionam**:
```bash
# Verificar dependências
pip3 list | grep -E "(psutil|requests|gpiozero|adafruit)"

# Testar manualmente
sudo python3 /usr/local/bin/pi4_health_monitor.py
```

4. **API não responde**:
```bash
# Verificar se está rodando
ps aux | grep node

# Verificar porta
netstat -tlnp | grep :3000

# Verificar logs
tail -f logs/app.log
```

### Logs Importantes:

```bash
# Logs do sistema
sudo journalctl -f

# Logs específicos
sudo journalctl -u pi4-health-monitor -f
sudo journalctl -u dht11-sensor -f
sudo journalctl -u mongod -f
sudo journalctl -u redis-server -f
```

## 🚀 Automação

### Script de Inicialização Automática

```bash
# Criar script de inicialização
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
```

### Configurar Inicialização Automática

```bash
# Adicionar ao rc.local
sudo nano /etc/rc.local

# Adicionar antes de "exit 0":
/usr/local/bin/start-smart-app.sh
```

## 📈 Performance

### Otimizações para Raspberry Pi:

1. **Overclock (opcional)**:
```bash
# Editar config.txt
sudo nano /boot/config.txt

# Adicionar:
over_voltage=2
arm_freq=1750
```

2. **Swap file**:
```bash
# Criar swap de 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

3. **Monitoramento de recursos**:
```bash
# Instalar htop
sudo apt install htop

# Monitorar recursos
htop
```

## 🎯 Próximos Passos

1. **Configurar backup automático** dos dados
2. **Implementar interface web** para visualização
3. **Configurar alertas por email/SMS**
4. **Adicionar mais sensores** (umidade, pressão, etc.)
5. **Implementar dashboard em tempo real**

## ✅ Checklist Final

- ✅ Node.js 18+ instalado
- ✅ Python 3.8+ instalado
- ✅ MongoDB rodando
- ✅ Redis rodando
- ✅ Scripts Python configurados
- ✅ Serviços systemd configurados
- ✅ Backend compilado e rodando
- ✅ APIs respondendo
- ✅ Logs funcionando
- ✅ Hardware conectado (se aplicável)

**O sistema está pronto para uso local no Raspberry Pi 4!** 🚀 