import { Injectable, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs';

@Injectable()
export class PiHealthMLService {
  private readonly logger = new Logger(PiHealthMLService.name);
  private model: tf.LayersModel | null = null;
  private isTrained = false;
  private trainingData: any[] = [];
  private readonly MIN_TRAINING_SAMPLES = 50;

  constructor() {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [8], units: 16, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 8, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 4, activation: 'softmax' }) // 4 alert levels
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      this.logger.log('Pi Health ML model initialized');
    } catch (error) {
      this.logger.error('Failed to initialize ML model:', error);
    }
  }

  /**
   * Analyze health data and detect anomalies
   */
  async analyzeHealthData(healthData: any): Promise<any> {
    try {
      if (!this.model) {
        return this.getDefaultAnalysis();
      }

      // Prepare input features
      const features = this.extractFeatures(healthData);
      const tensor = tf.tensor2d([features], [1, 8]);

      // Predict alert level
      const prediction = await this.model.predict(tensor) as tf.Tensor;
      const predictionArray = await prediction.array();
      const alertLevelIndex = predictionArray[0].indexOf(Math.max(...predictionArray[0]));

      // Calculate risk score based on multiple factors
      const riskScore = this.calculateRiskScore(healthData);

      // Detect anomalies
      const anomalyDetected = this.detectAnomaliesInternal(healthData);

      // Determine alert level based on risk score and anomalies
      const alertLevel = this.determineAlertLevel(riskScore, anomalyDetected, alertLevelIndex);

      const analysis = {
        riskScore: Math.round(riskScore * 100) / 100,
        anomalyDetected,
        prediction: this.getAlertLevelName(alertLevelIndex),
        confidence: Math.round(predictionArray[0][alertLevelIndex] * 100) / 100,
        alertLevel,
        factors: this.getRiskFactors(healthData)
      };

      this.logger.debug(`Health analysis completed: Risk: ${analysis.riskScore}, Alert: ${analysis.alertLevel}`);

      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing health data:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Extract features from health data for ML model
   */
  private extractFeatures(healthData: any): number[] {
    return [
      healthData.cpuTemperature / 100, // Normalize temperature (0-1)
      healthData.cpuUsage / 100,       // Normalize CPU usage (0-1)
      healthData.memoryUsage / 100,    // Normalize memory usage (0-1)
      healthData.diskUsage / 100,      // Normalize disk usage (0-1)
      (healthData.loadAverage1m || 0) / 10, // Normalize load average
      (healthData.loadAverage5m || 0) / 10,
      (healthData.loadAverage15m || 0) / 10,
      (healthData.uptime || 0) / (24 * 3600) // Normalize uptime to days
    ];
  }

  /**
   * Calculate risk score based on multiple health factors
   */
  private calculateRiskScore(healthData: any): number {
    let riskScore = 0;

    // CPU Temperature risk (critical above 80°C)
    if (healthData.cpuTemperature > 80) {
      riskScore += 0.4;
    } else if (healthData.cpuTemperature > 70) {
      riskScore += 0.2;
    } else if (healthData.cpuTemperature > 60) {
      riskScore += 0.1;
    }

    // CPU Usage risk (critical above 90%)
    if (healthData.cpuUsage > 90) {
      riskScore += 0.3;
    } else if (healthData.cpuUsage > 80) {
      riskScore += 0.2;
    } else if (healthData.cpuUsage > 70) {
      riskScore += 0.1;
    }

    // Memory Usage risk (critical above 90%)
    if (healthData.memoryUsage > 90) {
      riskScore += 0.3;
    } else if (healthData.memoryUsage > 80) {
      riskScore += 0.2;
    } else if (healthData.memoryUsage > 70) {
      riskScore += 0.1;
    }

    // Disk Usage risk (critical above 95%)
    if (healthData.diskUsage > 95) {
      riskScore += 0.3;
    } else if (healthData.diskUsage > 90) {
      riskScore += 0.2;
    } else if (healthData.diskUsage > 80) {
      riskScore += 0.1;
    }

    // Load Average risk
    const loadAvg = healthData.loadAverage1m || 0;
    if (loadAvg > 4) {
      riskScore += 0.3;
    } else if (loadAvg > 2) {
      riskScore += 0.2;
    } else if (loadAvg > 1) {
      riskScore += 0.1;
    }

    // Voltage risk (if available)
    if (healthData.voltage && healthData.voltage < 4.5) {
      riskScore += 0.2;
    }

    return Math.min(riskScore, 1.0); // Cap at 1.0
  }

  /**
   * Detect anomalies in health data (private helper)
   */
  private detectAnomaliesInternal(healthData: any): boolean {
    const anomalies = [];

    // Temperature anomaly
    if (healthData.cpuTemperature > 85) {
      anomalies.push('High CPU temperature');
    }

    // CPU usage anomaly
    if (healthData.cpuUsage > 95) {
      anomalies.push('Extremely high CPU usage');
    }

    // Memory usage anomaly
    if (healthData.memoryUsage > 95) {
      anomalies.push('Critical memory usage');
    }

    // Disk usage anomaly
    if (healthData.diskUsage > 98) {
      anomalies.push('Critical disk usage');
    }

    // Load average anomaly
    if (healthData.loadAverage1m > 8) {
      anomalies.push('Extremely high system load');
    }

    // Voltage anomaly
    if (healthData.voltage && healthData.voltage < 4.0) {
      anomalies.push('Low voltage detected');
    }

    return anomalies.length > 0;
  }

  /**
   * Determine alert level based on risk score and anomalies
   */
  private determineAlertLevel(riskScore: number, anomalyDetected: boolean, mlPrediction: number): string {
    if (anomalyDetected && riskScore > 0.7) {
      return 'emergency';
    } else if (riskScore > 0.6 || anomalyDetected) {
      return 'critical';
    } else if (riskScore > 0.4) {
      return 'warning';
    } else {
      return 'normal';
    }
  }

  /**
   * Get risk factors contributing to the current health status
   */
  private getRiskFactors(healthData: any): string[] {
    const factors = [];

    if (healthData.cpuTemperature > 70) {
      factors.push(`High CPU temperature: ${healthData.cpuTemperature}°C`);
    }

    if (healthData.cpuUsage > 80) {
      factors.push(`High CPU usage: ${healthData.cpuUsage}%`);
    }

    if (healthData.memoryUsage > 80) {
      factors.push(`High memory usage: ${healthData.memoryUsage}%`);
    }

    if (healthData.diskUsage > 90) {
      factors.push(`High disk usage: ${healthData.diskUsage}%`);
    }

    if (healthData.loadAverage1m > 2) {
      factors.push(`High system load: ${healthData.loadAverage1m}`);
    }

    if (healthData.voltage && healthData.voltage < 4.5) {
      factors.push(`Low voltage: ${healthData.voltage}V`);
    }

    return factors;
  }

  /**
   * Get alert level name
   */
  private getAlertLevelName(level: number): string {
    const levels = ['normal', 'warning', 'critical', 'emergency'];
    return levels[level] || 'normal';
  }

  /**
   * Train the model with new data
   */
  async trainModel(healthData: any, alertLevel: string): Promise<void> {
    try {
      if (!this.model) {
        this.logger.warn('Model not initialized');
        return;
      }

      this.trainingData.push({
        features: this.extractFeatures(healthData),
        label: this.getAlertLevelIndex(alertLevel)
      });

      if (this.trainingData.length >= this.MIN_TRAINING_SAMPLES) {
        await this.performTraining();
      }
    } catch (error) {
      this.logger.error('Error training model:', error);
    }
  }

  /**
   * Perform actual model training
   */
  private async performTraining(): Promise<void> {
    try {
      const features = this.trainingData.map(d => d.features);
      const labels = this.trainingData.map(d => d.label);

      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels.map(l => this.oneHotEncode(l, 4)));

      await this.model!.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            this.logger.debug(`Epoch ${epoch + 1}: loss = ${logs?.loss?.toFixed(4)}, accuracy = ${logs?.acc?.toFixed(4)}`);
          }
        }
      });

      this.isTrained = true;
      this.logger.log('Pi Health ML model training completed');

      // Clean up tensors
      xs.dispose();
      ys.dispose();
    } catch (error) {
      this.logger.error('Error during model training:', error);
    }
  }

  /**
   * One-hot encode labels
   */
  private oneHotEncode(index: number, size: number): number[] {
    const encoded = new Array(size).fill(0);
    encoded[index] = 1;
    return encoded;
  }

  /**
   * Get alert level index
   */
  private getAlertLevelIndex(level: string): number {
    const levels = ['normal', 'warning', 'critical', 'emergency'];
    return levels.indexOf(level) || 0;
  }

  /**
   * Get default analysis when ML is not available
   */
  private getDefaultAnalysis(): any {
    return {
      riskScore: 0.5,
      anomalyDetected: false,
      prediction: 'normal',
      confidence: 0.5,
      alertLevel: 'normal',
      factors: []
    };
  }

  /**
   * Get model status
   */
  getModelStatus(): any {
    return {
      isTrained: this.isTrained,
      trainingSamples: this.trainingData.length,
      minSamplesRequired: this.MIN_TRAINING_SAMPLES,
      modelArchitecture: 'Sequential Neural Network',
      inputFeatures: 8,
      outputClasses: 4,
      alertLevels: ['normal', 'warning', 'critical', 'emergency']
    };
  }

  /**
   * Reset model and training data
   */
  resetModel(): void {
    this.trainingData = [];
    this.isTrained = false;
    this.initializeModel();
    this.logger.log('Pi Health ML model reset');
  }

  /**
   * Detect anomalies in health data (public method for consumers)
   */
  async detectAnomalies(
    deviceId: string,
    cpuUsage: number,
    memoryUsage: number,
    diskUsage: number,
    temperature: number
  ): Promise<any> {
    try {
      const healthData = {
        cpuUsage,
        memoryUsage,
        diskUsage,
        cpuTemperature: temperature
      };

      const analysis = await this.analyzeHealthData(healthData);
      
      return {
        isAnomaly: analysis.anomalyDetected,
        severity: analysis.alertLevel,
        riskScore: analysis.riskScore,
        confidence: analysis.confidence,
        factors: analysis.factors
      };
    } catch (error) {
      this.logger.error(`Failed to detect anomalies for device ${deviceId}:`, error);
      return {
        isAnomaly: false,
        severity: 'normal',
        riskScore: 0,
        confidence: 0,
        factors: []
      };
    }
  }

  /**
   * Predict failure based on historical data
   */
  async predictFailure(deviceId: string, historicalData: any[]): Promise<any> {
    try {
      if (historicalData.length === 0) {
        return { riskLevel: 'low', confidence: 0 };
      }

      // Analyze recent health data for failure indicators
      const recentData = historicalData.slice(-10); // Last 10 readings
      let totalRiskScore = 0;
      
      for (const reading of recentData) {
        const analysis = await this.analyzeHealthData(reading);
        totalRiskScore += analysis.riskScore;
      }
      
      const avgRiskScore = totalRiskScore / recentData.length;

      // Determine risk level based on average risk score
      let riskLevel = 'low';
      if (avgRiskScore > 0.8) riskLevel = 'high';
      else if (avgRiskScore > 0.6) riskLevel = 'medium';

      return {
        riskLevel,
        confidence: Math.min(0.9, avgRiskScore + 0.3),
        avgRiskScore,
        dataPoints: historicalData.length
      };
    } catch (error) {
      this.logger.error(`Failed to predict failure for device ${deviceId}:`, error);
      return {
        riskLevel: 'low',
        confidence: 0,
        avgRiskScore: 0,
        dataPoints: 0
      };
    }
  }

  /**
   * Calculate health score
   */
  async calculateHealthScore(deviceId: string, healthData: any): Promise<any> {
    try {
      const analysis = await this.analyzeHealthData(healthData);
      
      // Convert risk score to health score (0-100, higher is better)
      const healthScore = Math.max(0, 100 - (analysis.riskScore * 100));
      
      return {
        score: Math.round(healthScore),
        riskLevel: analysis.alertLevel,
        factors: analysis.factors,
        confidence: analysis.confidence
      };
    } catch (error) {
      this.logger.error(`Failed to calculate health score for device ${deviceId}:`, error);
      return {
        score: 50,
        riskLevel: 'normal',
        factors: [],
        confidence: 0
      };
    }
  }
} 