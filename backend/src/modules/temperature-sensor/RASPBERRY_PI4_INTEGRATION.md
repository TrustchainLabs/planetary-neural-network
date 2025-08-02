# Raspberry Pi 4 DHT11 Sensor Integration

Este documento descreve como integrar um sensor DHT11 com Raspberry Pi 4 ao smart-app para monitoramento de temperatura e umidade em tempo real.

## Visão Geral

A integração permite que um Raspberry Pi 4 com sensor DHT11 envie dados de temperatura e umidade para a API do smart-app, onde os dados são processados, armazenados e analisados usando machine learning.

## Componentes

### Hardware
- Raspberry Pi 4 (qualquer modelo)
- Sensor DHT11
- Cabos jumper
- Breadboard (opcional)

### Software
- Python 3.7+
- CircuitPython DHT library
- Requests library
- smart-app API

## Configuração do Hardware

### Conexões do Sensor DHT11

| Sensor DHT11 | Raspberry Pi 4 |
|--------------|----------------|
| VCC          | 3.3V (Pin 1)  |
| GND          | GND (Pin 6)   |
| Data         | GPIO4 (Pin 7) |

### Diagrama de Conexão

```
DHT11 Sensor    Raspberry Pi 4
┌─────────┐     ┌─────────────┐
│   VCC   ├────►│ 3.3V (Pin1)│
│   GND   ├────►│ GND (Pin6)  │
│   Data  ├────►│ GPIO4(Pin7) │
└─────────┘     └─────────────┘
```

## Instalação

### 1. Preparação do Raspberry Pi

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências Python
sudo apt install -y python3-pip python3-venv python3-dev
```

### 2. Instalação das Bibliotecas Python

```bash
# Instalar CircuitPython DHT library
sudo pip3 install adafruit-circuitpython-dht

# Instalar requests para comunicação com API
sudo pip3 install requests
```

### 3. Configuração Automática

Execute o script de instalação:

```bash
# Tornar executável
chmod +x install_pi4_dht11.sh

# Executar instalação
sudo ./install_pi4_dht11.sh
```

### 4. Configuração Manual

Se preferir configurar manualmente:

```bash
# Copiar script para /usr/local/bin
sudo cp pi4_dht11_sensor.py /usr/local/bin/dht11_sensor.py
sudo chmod +x /usr/local/bin/dht11_sensor.py

# Criar serviço systemd
sudo nano /etc/systemd/system/dht11-sensor.service
```

Conteúdo do serviço:
```ini
[Unit]
Description=DHT11 Temperature and Humidity Sensor
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /usr/local/bin/dht11_sensor.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

## Configuração

### 1. Configurar API URL

Edite o arquivo `/usr/local/bin/dht11_sensor.py`:

```python
# Configuration
API_BASE_URL = "http://your-api-server:3000"  # URL da sua API
DEVICE_ID = "pi4-dht11-001"  # ID único do dispositivo
```

### 2. Configurar Localização

No mesmo arquivo, ajuste as coordenadas:

```python
'location': {
    'latitude': -23.5505,  # Sua latitude
    'longitude': -46.6333   # Sua longitude
}
```

## Uso

### 1. Teste Manual

```bash
# Testar sensor manualmente
sudo python3 /usr/local/bin/dht11_sensor.py
```

### 2. Gerenciamento do Serviço

```bash
# Iniciar serviço
sudo systemctl start dht11-sensor

# Parar serviço
sudo systemctl stop dht11-sensor

# Verificar status
sudo systemctl status dht11-sensor

# Habilitar início automático
sudo systemctl enable dht11-sensor

# Ver logs
sudo journalctl -u dht11-sensor -f
```

### 3. Monitoramento

```bash
# Ver logs em tempo real
sudo journalctl -u dht11-sensor -f

# Ver logs do arquivo
tail -f /var/log/dht11_sensor.log
```

## API Endpoints

### Enviar Dados do Sensor

```http
POST /dht11-sensor/readings
Content-Type: application/json

{
  "deviceId": "pi4-dht11-001",
  "temperature": 22.5,
  "humidity": 45.2,
  "timestamp": "2024-01-15T10:30:00Z",
  "gpioPin": 4,
  "sensorType": "DHT11",
  "location": {
    "latitude": -23.5505,
    "longitude": -46.6333
  }
}
```

### Consultar Dados

```http
# Última leitura
GET /dht11-sensor/readings/latest/pi4-dht11-001

# Histórico de leituras
GET /dht11-sensor/readings?deviceId=pi4-dht11-001&limit=100

# Estatísticas
GET /dht11-sensor/stats/pi4-dht11-001?hours=24

# Status do sensor
GET /dht11-sensor/status
```

## Estrutura de Dados

### DHT11Reading

```typescript
interface DHT11Reading {
  id: string;
  deviceId: string;
  temperature: number;      // °C
  humidity: number;         // %
  temperatureUnit: Unit;    // CELCIUS
  humidityUnit: string;     // %
  timestamp: Date;
  latitude?: number;
  longitude?: number;
  gpioPin?: number;
  sensorType: string;       // "DHT11"
  processed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Processamento de Dados

### 1. Armazenamento
- Dados são armazenados no MongoDB
- Índices otimizados para consultas por dispositivo e timestamp
- Validação de dados (temperatura: -100°C a 100°C, umidade: 0% a 100%)

### 2. Processamento em Lote
- Acumula 10 leituras antes de processar
- Análise de machine learning automática
- Detecção de anomalias e padrões

### 3. Análise de Machine Learning
- Predição de séries temporais
- Detecção de anomalias
- Avaliação de risco
- Reconhecimento de padrões

## Troubleshooting

### Problemas Comuns

1. **Erro de GPIO**
   ```bash
   # Verificar permissões
   sudo usermod -a -G gpio $USER
   # Reiniciar
   sudo reboot
   ```

2. **Sensor não detectado**
   ```bash
   # Verificar conexões
   # Testar com multímetro
   # Verificar alimentação 3.3V
   ```

3. **Erro de API**
   ```bash
   # Verificar conectividade
   curl http://your-api-server:3000/dht11-sensor/health
   
   # Verificar logs
   sudo journalctl -u dht11-sensor -f
   ```

4. **Leituras inválidas**
   ```bash
   # Verificar sensor
   # Limpar contatos
   # Verificar temperatura ambiente
   ```

### Logs

```bash
# Ver logs do sistema
sudo journalctl -u dht11-sensor -f

# Ver logs do arquivo
tail -f /var/log/dht11_sensor.log

# Ver logs de erro
sudo journalctl -u dht11-sensor -p err
```

## Segurança

### Recomendações

1. **Firewall**
   ```bash
   # Configurar firewall
   sudo ufw allow 3000/tcp
   sudo ufw enable
   ```

2. **SSL/TLS**
   - Use HTTPS para comunicação com API
   - Configure certificados SSL

3. **Autenticação**
   - Implemente autenticação na API
   - Use tokens de acesso

4. **Monitoramento**
   - Configure alertas para falhas
   - Monitore uso de recursos

## Performance

### Otimizações

1. **Intervalo de Leitura**
   - Padrão: 2 segundos
   - Ajuste conforme necessidade

2. **Buffer de Dados**
   - Armazena dados localmente em caso de falha de rede
   - Reenvia quando conexão restaurada

3. **Compressão**
   - Dados comprimidos antes do envio
   - Reduz uso de banda

## Monitoramento

### Métricas Importantes

- Temperatura média, mínima, máxima
- Umidade média, mínima, máxima
- Taxa de sucesso das leituras
- Latência de comunicação com API
- Uso de CPU e memória

### Alertas

- Temperatura fora do range esperado
- Umidade fora do range esperado
- Falha de comunicação com API
- Sensor não respondendo

## Extensões

### Possíveis Melhorias

1. **Múltiplos Sensores**
   - Suporte a múltiplos DHT11
   - Diferentes GPIO pins

2. **Outros Sensores**
   - DHT22 (mais preciso)
   - BME280 (temperatura, umidade, pressão)
   - DS18B20 (temperatura)

3. **Interface Web**
   - Dashboard em tempo real
   - Gráficos e estatísticas

4. **Notificações**
   - Alertas por email/SMS
   - Integração com IFTTT

## Suporte

Para suporte técnico:

1. Verifique os logs do sistema
2. Teste o sensor manualmente
3. Verifique conectividade de rede
4. Consulte a documentação da API

## Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes. 