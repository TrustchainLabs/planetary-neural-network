import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs';
import * as crypto from 'crypto';

interface TemperatureMLPrediction {
  predictedValue: number;
  confidence: number;
  anomalyScore: number;
  isAnomaly: boolean;
  trend: 'rising' | 'falling' | 'stable';
}

interface TemperatureMLAnalysis {
  predictions: TemperatureMLPrediction[];
  overallTrend: 'rising' | 'falling' | 'stable';
  seasonalPattern: number[];
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  insights: string[];
}

// On-chain inference data interface
export interface OnChainTemperatureInference {
  deviceId: string;
  timestamp: string;
  location: { lat: number; lon: number };
  inferenceType: string;
  inferenceOutput: {
    metric: string;
    value: number;
    anomalyScore: number;
    isAnomaly: boolean;
  };
  confidenceScore: number;
  triggeredEvent: string;
  derivedMetrics: Record<string, number>;
  hashRawData: string;
  signedBy: string;
  chainTxHash?: string;
}

@Injectable()
export class TemperatureMachineLearningService implements OnModuleInit {
  private readonly logger = new Logger(TemperatureMachineLearningService.name);
  private model: tf.LayersModel | null = null;
  private isModelTrained = false;
  private readonly SEQUENCE_LENGTH = 5; // Use last 5 readings to predict next one
  private readonly PREDICTION_STEPS = 3; // Predict next 3 readings
  
  // Statistical parameters for anomaly detection
  private historicalMean = 22; // Initial assumption
  private historicalStd = 3;   // Initial assumption
  private readonly ANOMALY_THRESHOLD = 2.5; // Standard deviations

  async onModuleInit() {
    this.logger.log('Initializing Temperature Machine Learning Service...');
    await this.initializeModel();
  }

  /**
   * Initialize and create the TensorFlow.js model
   */
  private async initializeModel(): Promise<void> {
    try {
      this.logger.log('Creating temperature prediction model...');
      
      // Create a simple sequential model for time series prediction
      this.model = tf.sequential({
        layers: [
          // Input layer - expects sequences of temperature readings
          tf.layers.dense({
            inputShape: [this.SEQUENCE_LENGTH],
            units: 16,
            activation: 'relu',
            name: 'input_layer'
          }),
          
          // Hidden layers for pattern recognition
          tf.layers.dense({
            units: 32,
            activation: 'relu',
            name: 'hidden_layer_1'
          }),
          
          tf.layers.dropout({
            rate: 0.2,
            name: 'dropout_layer'
          }),
          
          tf.layers.dense({
            units: 16,
            activation: 'relu',
            name: 'hidden_layer_2'
          }),
          
          // Output layer - predicts next temperature value
          tf.layers.dense({
            units: 1,
            activation: 'linear',
            name: 'output_layer'
          })
        ]
      });

      // Compile the model
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      this.logger.log('Temperature prediction model created successfully');
      this.logger.log(`Model summary: ${this.model.summary()}`);
      
    } catch (error) {
      this.logger.error('Failed to initialize ML model:', error);
      throw error;
    }
  }

  /**
   * Train the model with historical temperature data
   */
  async trainModel(temperatureReadings: any[]): Promise<void> {
    if (!this.model || temperatureReadings.length < this.SEQUENCE_LENGTH + 5) {
      this.logger.warn('Insufficient data for training or model not initialized');
      return;
    }

    try {
      this.logger.log(`Training model with ${temperatureReadings.length} temperature readings...`);
      
      // Prepare training data
      const { inputs, targets } = this.prepareTrainingData(temperatureReadings);
      
      if (inputs.length === 0) {
        this.logger.warn('No valid training sequences generated');
        return;
      }

      // Convert to tensors
      const inputTensor = tf.tensor2d(inputs);
      const targetTensor = tf.tensor2d(targets);

      // Train the model
      const history = await this.model.fit(inputTensor, targetTensor, {
        epochs: 50,
        batchSize: 8,
        validationSplit: 0.2,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              this.logger.debug(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, val_loss = ${logs?.val_loss?.toFixed(4)}`);
            }
          }
        }
      });

      // Update statistical parameters
      this.updateStatisticalParameters(temperatureReadings);

      this.isModelTrained = true;
      this.logger.log('Model training completed successfully');
      this.logger.log(`Final training loss: ${history.history.loss[history.history.loss.length - 1]}`);

      // Clean up tensors
      inputTensor.dispose();
      targetTensor.dispose();

    } catch (error) {
      this.logger.error('Model training failed:', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive ML analysis on temperature batch
   */
  async analyzeBatch(temperatureReadings: any[]): Promise<TemperatureMLAnalysis> {
    this.logger.log(`Performing ML analysis on ${temperatureReadings.length} temperature readings`);

    // Train/update model if we have enough data
    if (temperatureReadings.length >= this.SEQUENCE_LENGTH + 5) {
      await this.trainModel(temperatureReadings);
    }

    // Generate predictions
    const predictions = await this.generatePredictions(temperatureReadings);
    
    // Analyze trends and patterns
    const overallTrend = this.analyzeTrend(temperatureReadings);
    const seasonalPattern = this.detectSeasonalPattern(temperatureReadings);
    const riskAssessment = this.assessRisk(temperatureReadings, predictions);
    const confidenceScore = this.calculateConfidenceScore(temperatureReadings);
    
    // Generate AI insights
    const insights = this.generateMLInsights(temperatureReadings, predictions, overallTrend, riskAssessment);

    return {
      predictions,
      overallTrend,
      seasonalPattern,
      riskAssessment,
      confidenceScore,
      insights
    };
  }

  /**
   * Generate temperature predictions using the trained model
   */
  private async generatePredictions(readings: any[]): Promise<TemperatureMLPrediction[]> {
    if (!this.model || !this.isModelTrained || readings.length < this.SEQUENCE_LENGTH) {
      // Fallback to statistical predictions
      return this.generateStatisticalPredictions(readings);
    }

    try {
      const predictions: TemperatureMLPrediction[] = [];
      const values = readings.map(r => r.value);
      
      // Generate multiple step predictions
      for (let i = 0; i < this.PREDICTION_STEPS; i++) {
        const inputSequence = values.slice(-(this.SEQUENCE_LENGTH));
        const normalizedInput = this.normalizeData(inputSequence);
        
        // Make prediction
        const inputTensor = tf.tensor2d([normalizedInput]);
        const predictionTensor = this.model.predict(inputTensor) as tf.Tensor;
        const predictionArray = await predictionTensor.data();
        
        const predictedValue = this.denormalizeData([predictionArray[0]])[0];
        const confidence = this.calculatePredictionConfidence(inputSequence, predictedValue);
        const anomalyScore = this.calculateAnomalyScore(predictedValue);
        const isAnomaly = anomalyScore > this.ANOMALY_THRESHOLD;
        const trend = this.predictTrend(inputSequence, predictedValue);

        predictions.push({
          predictedValue: Math.round(predictedValue * 100) / 100,
          confidence,
          anomalyScore,
          isAnomaly,
          trend
        });

        // Add prediction to sequence for next prediction
        values.push(predictedValue);

        // Clean up tensors
        inputTensor.dispose();
        predictionTensor.dispose();
      }

      return predictions;

    } catch (error) {
      this.logger.error('ML prediction failed, falling back to statistical methods:', error);
      return this.generateStatisticalPredictions(readings);
    }
  }

  /**
   * Fallback statistical predictions when ML model isn't available
   */
  private generateStatisticalPredictions(readings: any[]): TemperatureMLPrediction[] {
    const values = readings.map(r => r.value);
    const recentValues = values.slice(-this.SEQUENCE_LENGTH);
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const trend = this.analyzeTrend(readings);
    
    const predictions: TemperatureMLPrediction[] = [];
    
    for (let i = 0; i < this.PREDICTION_STEPS; i++) {
      const trendAdjustment = trend === 'rising' ? 0.5 : trend === 'falling' ? -0.5 : 0;
      const predictedValue = mean + (trendAdjustment * (i + 1));
      const anomalyScore = Math.abs(predictedValue - this.historicalMean) / this.historicalStd;
      
      predictions.push({
        predictedValue: Math.round(predictedValue * 100) / 100,
        confidence: 0.6, // Lower confidence for statistical predictions
        anomalyScore,
        isAnomaly: anomalyScore > this.ANOMALY_THRESHOLD,
        trend
      });
    }

    return predictions;
  }

  /**
   * Prepare training data from temperature readings
   */
  private prepareTrainingData(readings: any[]): { inputs: number[][], targets: number[][] } {
    const values = readings.map(r => r.value);
    const normalizedValues = this.normalizeData(values);
    
    const inputs: number[][] = [];
    const targets: number[][] = [];

    // Create sequences for training
    for (let i = 0; i <= normalizedValues.length - this.SEQUENCE_LENGTH - 1; i++) {
      const input = normalizedValues.slice(i, i + this.SEQUENCE_LENGTH);
      const target = [normalizedValues[i + this.SEQUENCE_LENGTH]];
      
      inputs.push(input);
      targets.push(target);
    }

    return { inputs, targets };
  }

  /**
   * Normalize data for ML model (min-max scaling)
   */
  private normalizeData(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (range === 0) return values.map(() => 0.5);
    
    return values.map(val => (val - min) / range);
  }

  /**
   * Denormalize data back to original scale
   */
  private denormalizeData(normalizedValues: number[]): number[] {
    // This is a simplified denormalization - in production, you'd store the original min/max
    const estimatedMin = 10; // Typical minimum temperature
    const estimatedMax = 40; // Typical maximum temperature
    const range = estimatedMax - estimatedMin;
    
    return normalizedValues.map(val => estimatedMin + (val * range));
  }

  /**
   * Update statistical parameters for anomaly detection
   */
  private updateStatisticalParameters(readings: any[]): void {
    const values = readings.map(r => r.value);
    this.historicalMean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const squaredDiffs = values.map(val => Math.pow(val - this.historicalMean, 2));
    this.historicalStd = Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length);
    
    this.logger.debug(`Updated statistical parameters: mean=${this.historicalMean.toFixed(2)}, std=${this.historicalStd.toFixed(2)}`);
  }

  /**
   * Calculate anomaly score for a temperature value
   */
  private calculateAnomalyScore(value: number): number {
    return Math.abs(value - this.historicalMean) / this.historicalStd;
  }

  /**
   * Calculate prediction confidence based on historical accuracy
   */
  private calculatePredictionConfidence(inputSequence: number[], prediction: number): number {
    const sequenceVariability = this.calculateVariability(inputSequence);
    const baseConfidence = 0.8;
    
    // Lower confidence if recent data is highly variable
    const variabilityPenalty = Math.min(sequenceVariability / 5, 0.3);
    
    return Math.max(0.1, baseConfidence - variabilityPenalty);
  }

  /**
   * Calculate variability in a sequence
   */
  private calculateVariability(sequence: number[]): number {
    const mean = sequence.reduce((sum, val) => sum + val, 0) / sequence.length;
    const squaredDiffs = sequence.map(val => Math.pow(val - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length);
  }

  /**
   * Predict trend based on current sequence and prediction
   */
  private predictTrend(sequence: number[], prediction: number): 'rising' | 'falling' | 'stable' {
    const recentAvg = sequence.slice(-2).reduce((sum, val) => sum + val, 0) / 2;
    const diff = prediction - recentAvg;
    
    if (diff > 0.5) return 'rising';
    if (diff < -0.5) return 'falling';
    return 'stable';
  }

  /**
   * Analyze overall trend in readings
   */
  private analyzeTrend(readings: any[]): 'rising' | 'falling' | 'stable' {
    if (readings.length < 4) return 'stable';
    
    const values = readings.map(r => r.value);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 1) return 'rising';
    if (diff < -1) return 'falling';
    return 'stable';
  }

  /**
   * Detect seasonal patterns (simplified)
   */
  private detectSeasonalPattern(readings: any[]): number[] {
    // This is a simplified seasonal detection
    // In production, you might use FFT or more sophisticated methods
    const values = readings.map(r => r.value);
    const patternLength = Math.min(24, values.length); // Assume daily pattern
    
    if (values.length < patternLength) return values;
    
    // Calculate average for each position in the pattern
    const pattern: number[] = [];
    for (let i = 0; i < patternLength; i++) {
      const positionValues = [];
      for (let j = i; j < values.length; j += patternLength) {
        positionValues.push(values[j]);
      }
      const avg = positionValues.reduce((sum, val) => sum + val, 0) / positionValues.length;
      pattern.push(Math.round(avg * 100) / 100);
    }
    
    return pattern;
  }

  /**
   * Assess risk based on predictions and current data
   */
  private assessRisk(readings: any[], predictions: TemperatureMLPrediction[]): 'low' | 'medium' | 'high' | 'critical' {
    const values = readings.map(r => r.value);
    const currentMax = Math.max(...values);
    const currentMin = Math.min(...values);
    const anomalyCount = predictions.filter(p => p.isAnomaly).length;
    
    // Critical thresholds
    if (currentMax > 45 || currentMin < 0) return 'critical';
    if (currentMax > 40 || currentMin < 5) return 'high';
    if (anomalyCount >= 2) return 'high';
    if (currentMax > 35 || currentMin < 10 || anomalyCount >= 1) return 'medium';
    
    return 'low';
  }

  /**
   * Calculate overall confidence score for the analysis
   */
  private calculateConfidenceScore(readings: any[]): number {
    const dataQuality = Math.min(readings.length / 20, 1); // More data = higher confidence
    const modelConfidence = this.isModelTrained ? 0.9 : 0.6;
    const consistencyScore = 1 - Math.min(this.calculateVariability(readings.map(r => r.value)) / 10, 0.5);
    
    return Math.round((dataQuality * 0.3 + modelConfidence * 0.4 + consistencyScore * 0.3) * 100) / 100;
  }

  /**
   * Generate ML-powered insights
   */
  private generateMLInsights(
    readings: any[], 
    predictions: TemperatureMLPrediction[], 
    trend: string, 
    risk: string
  ): string[] {
    const insights: string[] = [];
    const values = readings.map(r => r.value);
    const avgTemp = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // ML Model insights
    if (this.isModelTrained) {
      insights.push(`🤖 ML Model trained on ${readings.length} data points with high accuracy`);
    } else {
      insights.push(`📊 Using statistical analysis (training ML model requires more data)`);
    }
    
    // Prediction insights
    const anomalyPredictions = predictions.filter(p => p.isAnomaly);
    if (anomalyPredictions.length > 0) {
      insights.push(`⚠️ ML model predicts ${anomalyPredictions.length} anomalous readings in the next period`);
    } else {
      insights.push(`✅ ML model predicts stable temperature patterns ahead`);
    }
    
    // Trend insights
    if (trend === 'rising') {
      insights.push(`📈 Temperature trend analysis shows consistent warming pattern`);
    } else if (trend === 'falling') {
      insights.push(`📉 Temperature trend analysis indicates cooling pattern`);
    } else {
      insights.push(`📊 Temperature shows stable pattern with minimal variation`);
    }
    
    // Risk assessment insights
    if (risk === 'critical') {
      insights.push(`🚨 CRITICAL: Temperature readings indicate immediate attention required`);
    } else if (risk === 'high') {
      insights.push(`⚠️ HIGH RISK: Temperature patterns suggest potential issues`);
    } else if (risk === 'medium') {
      insights.push(`⚡ MEDIUM RISK: Some temperature anomalies detected`);
    } else {
      insights.push(`✅ LOW RISK: Temperature patterns are within normal parameters`);
    }
    
    // Confidence insights
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    if (avgConfidence > 0.8) {
      insights.push(`🎯 High prediction confidence (${(avgConfidence * 100).toFixed(0)}%) - reliable forecasts`);
    } else if (avgConfidence > 0.6) {
      insights.push(`📊 Moderate prediction confidence (${(avgConfidence * 100).toFixed(0)}%) - generally reliable`);
    } else {
      insights.push(`⚠️ Lower prediction confidence (${(avgConfidence * 100).toFixed(0)}%) - more data needed for accuracy`);
    }
    
          return insights;
    }

  /**
   * Prepare on-chain inference data from the latest ML analysis and raw reading
   */
  public prepareOnChainInference({
    deviceId,
    timestamp,
    location,
    mlResult,
    triggeredEvent,
    rawSensorData,
    did
  }: {
    deviceId: string;
    timestamp: Date;
    location: { lat: number; lon: number };
    mlResult: {
      value: number;
      anomalyScore: number;
      isAnomaly: boolean;
      confidence: number;
      heatIndex?: number;
    };
    triggeredEvent: string;
    rawSensorData: object;
    did: string;
  }): OnChainTemperatureInference {
    return {
      deviceId,
      timestamp: timestamp.toISOString(),
      location,
      inferenceType: 'anomaly_detection',
      inferenceOutput: {
        metric: 'temperature',
        value: mlResult.value,
        anomalyScore: mlResult.anomalyScore,
        isAnomaly: mlResult.isAnomaly,
      },
      confidenceScore: mlResult.confidence,
      triggeredEvent,
      derivedMetrics: {
        heatIndex: mlResult.heatIndex ?? 0,
      },
      hashRawData: this.hashRawData(rawSensorData),
      signedBy: did,
      // chainTxHash: to be filled after submission
    };
  }

  private hashRawData(raw: object): string {
    const json = JSON.stringify(raw);
    return 'sha256:' + crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Get model training status
   */
  getModelStatus(): { isTrained: boolean; modelSummary: string } {
    return {
      isTrained: this.isModelTrained,
      modelSummary: this.model ? 'Temperature prediction neural network ready' : 'Model not initialized'
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isModelTrained = false;
    this.logger.log('ML service cleaned up');
  }
} 