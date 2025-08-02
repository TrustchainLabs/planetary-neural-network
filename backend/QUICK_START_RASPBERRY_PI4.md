# 🚀 Guia Rápido - Smart App Raspberry Pi 4

## ⚡ Instalação Rápida (5 minutos)

### 1. Preparar Raspberry Pi
```bash
# Conectar ao Raspberry Pi via SSH ou terminal
ssh pi@raspberrypi.local

# Navegar para diretório home
cd ~
```

### 2. Clonar e Instalar
```bash
# Clonar projeto (substitua pela URL do seu repositório)
git clone <URL_DO_REPOSITORIO> smart-app
cd smart-app

# Executar instalação automatizada
chmod +x install_raspberry_pi4.sh
sudo ./install_raspberry_pi4.sh
```

### 3. Iniciar Sistema
```bash
# Iniciar tudo automaticamente
sudo /usr/local/bin/start-smart-app.sh

# OU iniciar manualmente:
sudo systemctl start mongod
sudo systemctl start redis-server
npm run start:prod &
sudo systemctl start pi4-health-monitor
sudo systemctl start dht11-sensor
```

## 🧪 Testes Rápidos

### Verificar se está funcionando:
```bash
# Health checks
curl http://localhost:3000/pi-health/health
curl http://localhost:3000/dht11-sensor/health

# Ver dados
curl http://localhost:3000/pi-health/readings/latest/pi4-device-001
curl http://localhost:3000/dht11-sensor/readings/latest/pi4-dht11-001
```

## 📊 Comandos Úteis

### Status dos Serviços:
```bash
# Verificar status
sudo systemctl status pi4-health-monitor
sudo systemctl status dht11-sensor
sudo systemctl status mongod
sudo systemctl status redis-server

# Ver logs em tempo real
sudo journalctl -u pi4-health-monitor -f
sudo journalctl -u dht11-sensor -f
```

### Gerenciar Serviços:
```bash
# Parar serviços
sudo systemctl stop pi4-health-monitor
sudo systemctl stop dht11-sensor

# Reiniciar serviços
sudo systemctl restart pi4-health-monitor
sudo systemctl restart dht11-sensor

# Habilitar início automático
sudo systemctl enable pi4-health-monitor
sudo systemctl enable dht11-sensor
```

### Monitoramento:
```bash
# Ver uso de recursos
htop

# Ver temperatura da CPU
vcgencmd measure_temp

# Ver uso de memória
free -h

# Ver uso de disco
df -h
```

## 🔧 Troubleshooting Rápido

### Problema: API não responde
```bash
# Verificar se está rodando
ps aux | grep node

# Verificar porta
netstat -tlnp | grep :3000

# Reiniciar backend
pkill -f "npm run start:prod"
npm run start:prod &
```

### Problema: Scripts Python não funcionam
```bash
# Verificar dependências
pip3 list | grep -E "(psutil|requests|gpiozero|adafruit)"

# Testar manualmente
sudo python3 /usr/local/bin/pi4_health_monitor.py
sudo python3 /usr/local/bin/pi4_dht11_sensor.py
```

### Problema: Banco de dados não conecta
```bash
# Verificar MongoDB
sudo systemctl status mongod
sudo journalctl -u mongod -f

# Verificar Redis
sudo systemctl status redis-server
sudo journalctl -u redis-server -f
```

## 📱 Endpoints Principais

### PiHealth (Monitor de Saúde):
```bash
# Health check
GET http://localhost:3000/pi-health/health

# Última leitura
GET http://localhost:3000/pi-health/readings/latest/pi4-device-001

# Estatísticas
GET http://localhost:3000/pi-health/stats/pi4-device-001

# Status do dispositivo
GET http://localhost:3000/pi-health/status/pi4-device-001

# Recomendações
GET http://localhost:3000/pi-health/recommendations/pi4-device-001

# Alertas críticos
GET http://localhost:3000/pi-health/alerts/critical

# Status do ML
GET http://localhost:3000/pi-health/ml/status
```

### DHT11 Sensor:
```bash
# Health check
GET http://localhost:3000/dht11-sensor/health

# Última leitura
GET http://localhost:3000/dht11-sensor/readings/latest/pi4-dht11-001

# Estatísticas
GET http://localhost:3000/dht11-sensor/stats/pi4-dht11-001

# Status do sensor
GET http://localhost:3000/dht11-sensor/status
```

## 🔌 Hardware (DHT11 - Opcional)

### Conexões:
```
Raspberry Pi 4:
├── GPIO4 (Pin 7) → Data (DHT11)
├── 3.3V → VCC (DHT11)
└── GND → GND (DHT11)
```

### Testar Hardware:
```bash
# Testar sensor manualmente
sudo python3 /usr/local/bin/pi4_dht11_sensor.py

# Ver logs do sensor
sudo journalctl -u dht11-sensor -f
```

## 📈 Performance

### Otimizações:
```bash
# Criar swap file (se necessário)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Overclock (opcional - use com cuidado)
sudo nano /boot/config.txt
# Adicionar:
# over_voltage=2
# arm_freq=1750
```

## 🚨 Alertas e Monitoramento

### Verificar Alertas:
```bash
# Ver alertas críticos
curl http://localhost:3000/pi-health/alerts/critical | jq

# Ver recomendações
curl http://localhost:3000/pi-health/recommendations/pi4-device-001 | jq

# Ver status do ML
curl http://localhost:3000/pi-health/ml/status | jq
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

## 🔄 Reinicialização Automática

### Configurar para iniciar com o sistema:
```bash
# Editar rc.local
sudo nano /etc/rc.local

# Adicionar antes de "exit 0":
/usr/local/bin/start-smart-app.sh
```

## 📊 Dashboard Local

Acesse no navegador do Raspberry Pi:
- **PiHealth**: http://localhost:3000/pi-health/health
- **DHT11**: http://localhost:3000/dht11-sensor/health
- **Status**: http://localhost:3000/pi-health/status/pi4-device-001

## 🎯 Próximos Passos

1. **Configurar backup automático**
2. **Implementar interface web**
3. **Configurar alertas por email/SMS**
4. **Adicionar mais sensores**
5. **Implementar dashboard em tempo real**

## ✅ Checklist Final

- ✅ Sistema instalado e funcionando
- ✅ APIs respondendo
- ✅ Logs funcionando
- ✅ Hardware conectado (se aplicável)
- ✅ Alertas configurados
- ✅ ML funcionando

**O sistema está pronto para uso!** 🚀 