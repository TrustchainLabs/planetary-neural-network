# Raspberry Pi 4 Health Monitoring System

Este documento descreve o sistema completo de monitoramento de saúde do Raspberry Pi 4, incluindo coleta de métricas, análise de machine learning e sistema de alertas.

## Visão Geral

O sistema de monitoramento de saúde do Raspberry Pi 4 coleta métricas críticas do sistema em tempo real, analisa os dados usando machine learning para detectar anomalias e condições críticas, e envia alertas quando necessário.

## Componentes do Sistema

### Backend (NestJS)

#### Módulos Principais:
- **PiHealthModule** - Módulo principal
- **PiHealthService** - Lógica de negócio
- **PiHealthMLService** - Análise de machine learning
- **PiHealthController** - Endpoints REST

#### Entidades:
- **PiHealth** - Schema MongoDB para dados de saúde
- **CreatePiHealthDto** - Validação de dados

### Scripts Python

#### Monitor de Saúde:
- `pi4_health_monitor.py` - Script principal para Raspberry Pi
- `install_pi4_health_monitor.sh` - Instalação automática
- `test_pi_health_integration.py` - Simulador para testes

## Métricas Monitoradas

### 1. CPU
- **Temperatura**: Monitorada via `/sys/class/thermal/thermal_zone0/temp`
- **Uso**: Percentual de utilização da CPU
- **Frequência**: Clock atual em MHz
- **Voltagem**: Tensão do core (se disponível)

### 2. Memória
- **Uso**: Percentual de RAM utilizada
- **Disponível**: RAM livre
- **Swap**: Uso de memória virtual

### 3. Disco
- **Uso**: Percentual de espaço utilizado
- **Livre**: Espaço disponível
- **I/O**: Atividade de leitura/escrita

### 4. Sistema
- **Load Average**: Média de carga (1m, 5m, 15m)
- **Uptime**: Tempo de funcionamento
- **Processos**: Número de processos ativos

### 5. Rede
- **Upload**: Dados enviados (MB/s)
- **Download**: Dados recebidos (MB/s)
- **Conexões**: Conexões ativas

## Níveis de Alerta

### 1. Normal (0-40% risco)
- Sistema operando normalmente
- Todas as métricas dentro dos parâmetros aceitáveis

### 2. Warning (40-60% risco)
- Sistema mostrando sinais de estresse
- Algumas métricas elevadas
- Monitoramento recomendado

### 3. Critical (60-80% risco)
- Problemas significativos detectados
- Intervenção recomendada
- Alertas automáticos enviados

### 4. Emergency (80-100% risco)
- Condições críticas detectadas
- Atenção imediata necessária
- Alertas urgentes enviados

## Análise de Machine Learning

### Modelo Neural
- **Arquitetura**: Rede neural sequencial
- **Entrada**: 8 features normalizadas
- **Saída**: 4 classes (níveis de alerta)
- **Camadas**: 16 → 8 → 4 neurônios

### Features Utilizadas
1. Temperatura da CPU (normalizada 0-1)
2. Uso da CPU (normalizado 0-1)
3. Uso da memória (normalizado 0-1)
4. Uso do disco (normalizado 0-1)
5. Load average 1m (normalizado 0-1)
6. Load average 5m (normalizado 0-1)
7. Load average 15m (normalizado 0-1)
8. Uptime em dias (normalizado)

### Detecção de Anomalias
- **Temperatura > 85°C**: Anomalia crítica
- **CPU > 95%**: Uso extremamente alto
- **Memória > 95%**: Uso crítico de RAM
- **Disco > 98%**: Espaço crítico
- **Load > 8**: Carga extremamente alta
- **Voltagem < 4.0V**: Tensão baixa

## Instalação

### 1. No Raspberry Pi 4

```bash
# Instalar dependências
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv python3-dev
sudo pip3 install psutil requests gpiozero

# Executar instalação automática
chmod +x install_pi4_health_monitor.sh
sudo ./install_pi4_health_monitor.sh
```

### 2. Configuração

Editar `/usr/local/bin/pi4_health_monitor.py`:

```python
# Configuration
API_BASE_URL = "http://your-api-server:3000"  # URL da sua API
DEVICE_ID = "pi4-device-001"  # ID único do dispositivo
MONITORING_INTERVAL = 30  # Intervalo em segundos
```

### 3. Gerenciamento do Serviço

```bash
# Iniciar serviço
sudo systemctl start pi4-health-monitor

# Parar serviço
sudo systemctl stop pi4-health-monitor

# Verificar status
sudo systemctl status pi4-health-monitor

# Habilitar início automático
sudo systemctl enable pi4-health-monitor

# Ver logs
sudo journalctl -u pi4-health-monitor -f
```

## API Endpoints

### Enviar Dados de Saúde

```http
POST /pi-health/readings
Content-Type: application/json

{
  "deviceId": "pi4-device-001",
  "cpuTemperature": 45.2,
  "cpuUsage": 35.5,
  "memoryUsage": 52.3,
  "diskUsage": 68.7,
  "networkUpload": 2.1,
  "networkDownload": 5.4,
  "uptime": 86400,
  "loadAverage1m": 1.2,
  "loadAverage5m": 1.1,
  "loadAverage15m": 1.0,
  "voltage": 4.8,
  "frequency": 1400,
  "timestamp": "2024-01-15T10:30:00Z",
  "location": {
    "latitude": -23.5505,
    "longitude": -46.6333
  }
}
```

### Consultar Dados

```http
# Última leitura
GET /pi-health/readings/latest/pi4-device-001

# Histórico de leituras
GET /pi-health/readings?deviceId=pi4-device-001&limit=100

# Estatísticas
GET /pi-health/stats/pi4-device-001?hours=24

# Status do dispositivo
GET /pi-health/status/pi4-device-001

# Alertas críticos
GET /pi-health/alerts/critical

# Recomendações
GET /pi-health/recommendations/pi4-device-001
```

## Estrutura de Dados

### PiHealth

```typescript
interface PiHealth {
  id: string;
  deviceId: string;
  cpuTemperature: number;      // °C
  cpuUsage: number;            // %
  memoryUsage: number;         // %
  diskUsage: number;           // %
  networkUpload?: number;      // MB/s
  networkDownload?: number;    // MB/s
  uptime?: number;             // seconds
  loadAverage1m?: number;      // 1-minute load
  loadAverage5m?: number;      // 5-minute load
  loadAverage15m?: number;     // 15-minute load
  voltage?: number;            // V
  frequency?: number;          // MHz
  timestamp: Date;
  latitude?: number;
  longitude?: number;
  alertLevel: 'normal' | 'warning' | 'critical' | 'emergency';
  alertMessage?: string;
  processed: boolean;
  mlAnalysis?: {
    riskScore: number;
    anomalyDetected: boolean;
    prediction: string;
    confidence: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Processamento de Dados

### 1. Coleta
- Script Python coleta métricas a cada 30 segundos
- Validação de dados antes do envio
- Retry automático em caso de falha

### 2. Análise ML
- Análise em tempo real de cada leitura
- Cálculo de score de risco (0-100%)
- Detecção de anomalias
- Predição de nível de alerta

### 3. Alertas
- Alertas automáticos para condições críticas
- Mensagens personalizadas baseadas na análise
- Logs estruturados para auditoria

### 4. Processamento em Lote
- Acumula 10 leituras antes de processar
- Análise de tendências
- Treinamento do modelo ML

## Testes e Simulação

### Script de Teste Local

```bash
# Simular dados de saúde
python3 test_pi_health_integration.py --api-url http://localhost:3000

# Com parâmetros customizados
python3 test_pi_health_integration.py --device-id test-device --interval 10
```

### Endpoints de Teste

```bash
# Health check
curl http://localhost:3000/pi-health/health

# Gerar leitura mock
curl -X POST http://localhost:3000/pi-health/mock/reading

# Ver última leitura
curl http://localhost:3000/pi-health/readings/latest/pi4-device-001

# Ver status do dispositivo
curl http://localhost:3000/pi-health/status/pi4-device-001

# Ver recomendações
curl http://localhost:3000/pi-health/recommendations/pi4-device-001
```

## Monitoramento e Alertas

### Métricas Importantes

- **Temperatura CPU**: > 80°C = Crítico
- **Uso CPU**: > 90% = Crítico
- **Uso Memória**: > 90% = Crítico
- **Uso Disco**: > 95% = Crítico
- **Load Average**: > 4 = Crítico
- **Voltagem**: < 4.5V = Aviso

### Alertas Automáticos

1. **Emergency**: Temperatura > 85°C ou CPU > 95%
2. **Critical**: Múltiplas métricas elevadas
3. **Warning**: Algumas métricas elevadas
4. **Normal**: Todas as métricas OK

### Recomendações do Sistema

- **Temperatura alta**: Adicionar ventilação
- **CPU alto**: Otimizar processos
- **Memória alta**: Adicionar RAM
- **Disco cheio**: Limpar arquivos
- **Load alto**: Reduzir carga
- **Voltagem baixa**: Verificar fonte

## Troubleshooting

### Problemas Comuns

1. **Erro de permissão**
   ```bash
   # Verificar permissões
   sudo chmod +x /usr/local/bin/pi4_health_monitor.py
   ```

2. **API não acessível**
   ```bash
   # Verificar conectividade
   curl http://your-api-server:3000/pi-health/health
   ```

3. **Dados inválidos**
   ```bash
   # Verificar logs
   sudo journalctl -u pi4-health-monitor -f
   ```

4. **Serviço não inicia**
   ```bash
   # Verificar status
   sudo systemctl status pi4-health-monitor
   sudo journalctl -u pi4-health-monitor -n 50
   ```

### Logs

```bash
# Ver logs do sistema
sudo journalctl -u pi4-health-monitor -f

# Ver logs do arquivo
tail -f /var/log/pi4_health_monitor.log

# Ver logs de erro
sudo journalctl -u pi4-health-monitor -p err
```

## Segurança

### Recomendações

1. **Firewall**
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw enable
   ```

2. **SSL/TLS**
   - Use HTTPS para comunicação
   - Configure certificados SSL

3. **Autenticação**
   - Implemente autenticação na API
   - Use tokens de acesso

4. **Monitoramento**
   - Configure alertas para falhas
   - Monitore uso de recursos

## Performance

### Otimizações

1. **Intervalo de Monitoramento**
   - Padrão: 30 segundos
   - Ajuste conforme necessidade

2. **Buffer de Dados**
   - Armazena dados localmente
   - Reenvia quando conexão restaurada

3. **Compressão**
   - Dados comprimidos antes do envio
   - Reduz uso de banda

## Extensões

### Possíveis Melhorias

1. **Múltiplos Dispositivos**
   - Suporte a múltiplos Raspberry Pi
   - Dashboard centralizado

2. **Métricas Adicionais**
   - Temperatura da GPU
   - Uso de GPU
   - Temperatura da placa

3. **Interface Web**
   - Dashboard em tempo real
   - Gráficos interativos
   - Alertas visuais

4. **Notificações**
   - Alertas por email/SMS
   - Integração com IFTTT
   - Webhooks

5. **Análise Avançada**
   - Predição de falhas
   - Otimização automática
   - Relatórios automáticos

## Suporte

Para suporte técnico:

1. Verifique os logs do sistema
2. Teste o monitor manualmente
3. Verifique conectividade de rede
4. Consulte a documentação da API

## Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes. 