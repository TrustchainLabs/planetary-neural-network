import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { TemperatureSensorModelService } from './temperature-sensor.model.service';
import { TemperatureMachineLearningService } from './temperature-ml.service';
import { SmartLedgersService } from '@hsuite/smart-ledgers';
import { SmartConfigService } from '@hsuite/smart-config';
import { TemperatureAnalysis } from './entities/temperature-analysis.entity';

@Processor('temperature-processing')
export class TemperatureSensorConsumer {
  private readonly logger = new Logger(TemperatureSensorConsumer.name);

  constructor(
    private readonly temperatureModelService: TemperatureSensorModelService,
    private readonly temperatureMlService: TemperatureMachineLearningService,
    private readonly smartLedgersService: SmartLedgersService,
    private readonly smartConfigService: SmartConfigService,
  ) {}

  @Process('process-temperature-batch')
  async processTemperatureBatch(job: Job<{ deviceId: string; batchId: string; batchSize: number }>) {
    const { deviceId, batchId, batchSize } = job.data;
    this.logger.log(`Processing temperature batch: ${batchId} for device ${deviceId}`);

    try {
      // 1. Get unprocessed readings for this device
      const readings = await this.temperatureModelService.getUnprocessedReadings(deviceId, batchSize);
      
      if (readings.length === 0) {
        this.logger.warn(`No unprocessed readings found for device ${deviceId}`);
        return { batchId, processed: false, reason: 'No unprocessed readings' };
      }

      this.logger.log(`Analyzing ${readings.length} temperature readings for batch ${batchId}`);

      // 2. Perform ML-powered batch analysis 
      this.logger.log('🤖 Running TensorFlow.js ML analysis...');
      const mlAnalysis = await this.temperatureMlService.analyzeBatch(readings);

      // 3. Combine with traditional statistical analysis
      const batchAnalysis = await this.performBatchAnalysis(readings, batchId);
      
      // 4. Generate comprehensive AI insights
      const aiAnalysis = await this.performAdvancedAIAnalysis(readings, batchAnalysis, mlAnalysis);

      // 5. Create analysis record with ML results
      const analysisRecord = await this.createAnalysisRecord(
        deviceId, 
        batchId, 
        readings, 
        batchAnalysis, 
        aiAnalysis,
        mlAnalysis
      );

      // 5. Submit AI analysis to blockchain/HCS topic (not raw readings!)
      const chainTxHash = await this.submitAnalysisToChain(analysisRecord, mlAnalysis, readings);

      // 6. Update analysis record with chain transaction hash
      await this.temperatureModelService.updateAnalysisWithChainTx(
        analysisRecord._id.toString(), 
        chainTxHash
      );

      // 7. Mark all readings in the batch as processed
      const readingIds = readings.map(r => r._id.toString());
      await this.temperatureModelService.markBatchAsProcessed(readingIds);

      this.logger.log(`Successfully processed temperature batch: ${batchId}`);
      
      return {
        batchId,
        deviceId,
        analysisId: analysisRecord._id.toString(),
        readingsProcessed: readings.length,
        chainTxHash,
        processed: true,
      };

    } catch (error) {
      this.logger.error(`Failed to process temperature batch ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * Performs batch analysis on multiple temperature readings
   */
  private async performBatchAnalysis(readings: any[], batchId: string): Promise<any> {
    try {
      if (readings.length === 0) {
        throw new Error('No readings provided for batch analysis');
      }

      const values = readings.map(r => r.value);
      const timestamps = readings.map(r => r.timestamp);
      
      // Statistical calculations
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      const standardDeviation = this.calculateStandardDeviation(values);
      
      // Trend analysis (compare first half vs second half)
      const trend = this.calculateBatchTrend(values);
      
      // Outlier detection
      const outliers = this.detectBatchOutliers(readings, average, standardDeviation);
      
      // Severity assessment
      const severity = this.assessBatchSeverity(average, minimum, maximum, outliers.length, readings.length);
      
      // Stability score (how consistent the readings are)
      const stabilityScore = this.calculateStabilityScore(standardDeviation, Math.abs(maximum - minimum));

      return {
        average: Math.round(average * 100) / 100,
        minimum,
        maximum,
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        trend,
        outliers,
        severity,
        stabilityScore: Math.round(stabilityScore * 100) / 100,
        readingCount: readings.length,
        timeRange: {
          start: timestamps[0],
          end: timestamps[timestamps.length - 1],
        },
      };

    } catch (error) {
      this.logger.error('Error in batch analysis:', error);
      throw error;
    }
  }

  /**
   * Performs advanced AI analysis combining ML predictions and statistical analysis
   */
  private async performAdvancedAIAnalysis(readings: any[], batchAnalysis: any, mlAnalysis: any): Promise<string> {
    const { predictions, insights, riskAssessment, confidenceScore } = mlAnalysis;
    const deviceId = readings[0]?.deviceId || 'unknown';

    let aiInsight = `🤖 ADVANCED ML ANALYSIS for ${readings.length} temperature readings from device ${deviceId}:\n\n`;
    
    // ML Model Status
    const modelStatus = this.temperatureMlService.getModelStatus();
    if (modelStatus.isTrained) {
      aiInsight += `✅ TensorFlow.js Neural Network: TRAINED & ACTIVE\n`;
      aiInsight += `📊 Model Confidence: ${(confidenceScore * 100).toFixed(0)}%\n\n`;
    } else {
      aiInsight += `⚠️ ML Model: Training in progress (using statistical fallback)\n\n`;
    }

    // Temperature Summary
    aiInsight += `📊 STATISTICAL SUMMARY:\n`;
    aiInsight += `• Average: ${batchAnalysis.average}°C\n`;
    aiInsight += `• Range: ${batchAnalysis.minimum}°C to ${batchAnalysis.maximum}°C\n`;
    aiInsight += `• Stability Score: ${batchAnalysis.stabilityScore}/1.0\n\n`;

    // ML Predictions
    if (predictions && predictions.length > 0) {
      aiInsight += `🔮 ML PREDICTIONS (Next ${predictions.length} readings):\n`;
      predictions.forEach((pred: any, index: number) => {
        const icon = pred.isAnomaly ? '⚠️' : '✅';
        aiInsight += `${icon} Reading ${index + 1}: ${pred.predictedValue}°C (${(pred.confidence * 100).toFixed(0)}% confidence)\n`;
      });
      aiInsight += '\n';
    }

    // Risk Assessment
    aiInsight += `🎯 RISK ASSESSMENT: ${riskAssessment.toUpperCase()}\n`;
    if (riskAssessment === 'critical') {
      aiInsight += `🚨 IMMEDIATE ACTION REQUIRED\n`;
    } else if (riskAssessment === 'high') {
      aiInsight += `⚠️ Close monitoring recommended\n`;
    } else if (riskAssessment === 'medium') {
      aiInsight += `📊 Some concerns detected\n`;
    } else {
      aiInsight += `✅ Operating within normal parameters\n`;
    }
    aiInsight += '\n';

    // ML Insights
    if (insights && insights.length > 0) {
      aiInsight += `🧠 ML INSIGHTS:\n`;
      insights.forEach((insight: string) => {
        aiInsight += `${insight}\n`;
      });
      aiInsight += '\n';
    }

    // Anomaly Detection
    const anomalyPredictions = predictions?.filter((p: any) => p.isAnomaly) || [];
    if (anomalyPredictions.length > 0) {
      aiInsight += `⚠️ ANOMALY DETECTION:\n`;
      aiInsight += `• Predicted anomalies: ${anomalyPredictions.length}\n`;
      anomalyPredictions.forEach((pred: any, index: number) => {
        aiInsight += `• Anomaly ${index + 1}: ${pred.predictedValue}°C (score: ${pred.anomalyScore.toFixed(2)})\n`;
      });
    } else {
      aiInsight += `✅ NO ANOMALIES DETECTED in predictions\n`;
    }

    return aiInsight;
  }

  /**
   * Performs AI analysis on a batch of temperature readings (legacy method for compatibility)
   */
  private async performBatchAIAnalysis(readings: any[], batchAnalysis: any): Promise<string> {
    // TODO: Integrate with OpenAI for advanced analysis
    const { average, trend, outliers, severity, stabilityScore } = batchAnalysis;
    const deviceId = readings[0]?.deviceId || 'unknown';

    let aiInsight = `AI Analysis for ${readings.length} temperature readings from device ${deviceId}:\n\n`;
    
    aiInsight += `📊 SUMMARY:\n`;
    aiInsight += `• Average temperature: ${average}°C\n`;
    aiInsight += `• Temperature range: ${batchAnalysis.minimum}°C to ${batchAnalysis.maximum}°C\n`;
    aiInsight += `• Stability score: ${stabilityScore}/1.0 (${stabilityScore > 0.8 ? 'Very stable' : stabilityScore > 0.6 ? 'Moderately stable' : 'Unstable'})\n\n`;

    if (outliers.length > 0) {
      aiInsight += `⚠️ ANOMALIES DETECTED:\n`;
      aiInsight += `• Found ${outliers.length} unusual readings out of ${readings.length} total\n`;
      outliers.slice(0, 3).forEach((outlier: any, index: number) => {
        aiInsight += `• Reading ${index + 1}: ${outlier.value}°C (${outlier.deviation.toFixed(1)}σ from mean)\n`;
      });
      aiInsight += '\n';
    }

    aiInsight += `📈 TREND ANALYSIS:\n`;
    if (trend === 'rising') {
      aiInsight += `• Temperature is trending upward - may indicate heating source activation or environmental change\n`;
    } else if (trend === 'falling') {
      aiInsight += `• Temperature is trending downward - possible cooling activation or external cooling\n`;
    } else {
      aiInsight += `• Temperature appears stable with no significant trend\n`;
    }

    aiInsight += `\n🎯 SEVERITY ASSESSMENT: ${severity.toUpperCase()}\n`;
    
    const predictions = this.generatePredictions(batchAnalysis, readings);
    aiInsight += `\n🔮 PREDICTIONS:\n`;
    aiInsight += `• Next hour trend: ${predictions.nextHourTrend}\n`;
    aiInsight += `• Expected range: ${predictions.expectedRange.min}°C to ${predictions.expectedRange.max}°C\n`;
    aiInsight += `• Confidence: ${(predictions.confidence * 100).toFixed(0)}%\n`;

    // TODO: Replace with actual OpenAI API call
    // const openAIResponse = await this.openAIService.analyzeTemperatureBatch({
    //   readings,
    //   analysis: batchAnalysis,
    //   context: 'IoT temperature monitoring'
    // });

    return aiInsight;
  }

  /**
   * Creates an analysis record in the database with ML results
   */
  private async createAnalysisRecord(
    deviceId: string, 
    batchId: string, 
    readings: any[], 
    batchAnalysis: any, 
    aiAnalysis: string,
    mlAnalysis?: any
  ): Promise<TemperatureAnalysis> {
    const timestamps = readings.map(r => r.timestamp);
    
    // Use ML predictions if available, otherwise fallback to statistical predictions
    const predictions = mlAnalysis?.predictions || this.generatePredictions(batchAnalysis, readings);
    
    const analysisData = {
      deviceId,
      batchId,
      readingCount: readings.length,
      timeRange: {
        start: timestamps[0],
        end: timestamps[timestamps.length - 1],
      },
      averageTemperature: batchAnalysis.average,
      minimumTemperature: batchAnalysis.minimum,
      maximumTemperature: batchAnalysis.maximum,
      outliers: batchAnalysis.outliers,
      predictions,
      severity: mlAnalysis?.riskAssessment || batchAnalysis.severity,
      warnings: this.generateWarnings(batchAnalysis, mlAnalysis),
      aiInsights: aiAnalysis,
      location: readings[0]?.location,
      analysisTimestamp: new Date(),
      statisticalData: {
        standardDeviation: batchAnalysis.standardDeviation,
        variance: Math.pow(batchAnalysis.standardDeviation, 2),
        trendSlope: this.calculateTrendSlope(readings),
        stabilityScore: batchAnalysis.stabilityScore,
        // Add ML-specific metrics
        mlConfidenceScore: mlAnalysis?.confidenceScore || 0,
        modelTrained: this.temperatureMlService.getModelStatus().isTrained,
      },
    };

    return await this.temperatureModelService.createAnalysis(analysisData);
  }

  /**
   * Submits analysis results to blockchain/HCS topic using the new on-chain inference format
   */
  private async submitAnalysisToChain(
    analysis: TemperatureAnalysis, 
    mlAnalysis: any, 
    readings: any[]
  ): Promise<string> {
    try {
      // Get the most recent reading from the batch for context
      const latestReading = readings[readings.length - 1];
      
      // Determine if anomaly was detected
      const isAnomaly = mlAnalysis?.predictions?.some(p => p.isAnomaly) || 
                       analysis.severity === 'critical' || 
                       analysis.severity === 'high';
      
      // Calculate anomaly score (0-10 scale)
      const anomalyScore = isAnomaly ? 
        Math.min(10, (mlAnalysis?.predictions?.[0]?.anomalyScore || 5) * 2) : 
        (mlAnalysis?.predictions?.[0]?.anomalyScore || 0);
      
      // Determine triggered event
      const triggeredEvent = isAnomaly ? 
        `temperature anomaly detected > threshold` : 
        `normal temperature reading`;
      
      // Prepare on-chain inference data using the ML service method
      const onChainData = this.temperatureMlService.prepareOnChainInference({
        deviceId: analysis.deviceId,
        timestamp: analysis.analysisTimestamp,
        location: analysis.location ? 
          { lat: analysis.location.latitude, lon: analysis.location.longitude } : 
          { lat: -23.55, lon: -46.63 }, // Default location if not available
        mlResult: {
          value: analysis.averageTemperature,
          anomalyScore: anomalyScore,
          isAnomaly: isAnomaly,
          confidence: mlAnalysis?.confidenceScore || 0.75,
          heatIndex: this.calculateHeatIndex(analysis.averageTemperature, 50) // Default humidity 50%
        },
        triggeredEvent: triggeredEvent,
        rawSensorData: {
          batchId: analysis.batchId,
          readingCount: analysis.readingCount,
          averageTemperature: analysis.averageTemperature,
          temperatureRange: {
            min: analysis.minimumTemperature,
            max: analysis.maximumTemperature
          },
          analysisTimestamp: analysis.analysisTimestamp
        },
        did: 'did:hbarsuite:smartnode-001' // TODO: Get from device configuration
      });
      
      this.logger.log('Submitting temperature inference to chain:', JSON.stringify(onChainData, null, 2));
      
      // TODO: Use device's HCS topic to submit inference data
      // const chain = this.smartConfigService.getChain();
      // const ledger = this.smartLedgersService.getAdapter(chain).getLedger();
      // const txHash = await ledger.submitToTopic(deviceTopic, onChainData);
      
      // Simulate transaction hash in the expected format
      const simulatedTxHash = `0.0.123456-${Date.now()}.${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Update the on-chain data with the transaction hash
      onChainData.chainTxHash = simulatedTxHash;
      
      this.logger.log(`Simulated chain submission of inference with hash: ${simulatedTxHash}`);
      this.logger.log('Final on-chain data:', JSON.stringify(onChainData, null, 2));
      
      return simulatedTxHash;

    } catch (error) {
      this.logger.error('Error submitting inference to chain:', error);
      throw error;
    }
  }

  /**
   * Calculate heat index from temperature and humidity
   */
  private calculateHeatIndex(tempCelsius: number, humidity: number): number {
    // Convert to Fahrenheit for heat index calculation
    const tempF = (tempCelsius * 9/5) + 32;
    
    // Simplified heat index formula
    if (tempF < 80) {
      return tempCelsius; // No heat index below 80°F
    }
    
    const hi = -42.379 + 
               2.04901523 * tempF + 
               10.14333127 * humidity - 
               0.22475541 * tempF * humidity - 
               6.83783e-3 * tempF * tempF - 
               5.481717e-2 * humidity * humidity + 
               1.22874e-3 * tempF * tempF * humidity + 
               8.5282e-4 * tempF * humidity * humidity - 
               1.99e-6 * tempF * tempF * humidity * humidity;
    
    // Convert back to Celsius
    return (hi - 32) * 5/9;
  }

  /**
   * Performs basic data analysis on temperature reading (deprecated - kept for compatibility)
   */
  private async performDataAnalysis(reading: any): Promise<any> {
    try {
      // Get recent readings for context
      const recentReadings = await this.temperatureModelService.findAll({
        deviceId: reading.deviceId,
        limit: 10,
      });

      if (recentReadings.length < 2) {
        return {
          trend: 'insufficient_data',
          anomaly: false,
          severity: 'normal',
        };
      }

      // Calculate temperature trend
      const values = recentReadings.map(r => r.value);
      const trend = this.calculateTrend(values);
      
      // Detect anomalies
      const anomaly = this.detectAnomaly(reading.value, values);
      
      // Assess severity
      const severity = this.assessSeverity(reading.value, trend, anomaly);

      return {
        trend,
        anomaly,
        severity,
        context: {
          recentAverage: values.reduce((sum, val) => sum + val, 0) / values.length,
          standardDeviation: this.calculateStandardDeviation(values),
          readingCount: recentReadings.length,
        },
      };

    } catch (error) {
      this.logger.error('Error in data analysis:', error);
      return {
        trend: 'error',
        anomaly: false,
        severity: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * TODO: AI Analysis using OpenAI
   * This will be implemented later to provide intelligent insights
   */
  private async performAIAnalysis(reading: any, analysisResult: any): Promise<string> {
    // TODO: Integrate with OpenAI to analyze temperature patterns
    // For now, return a placeholder based on basic analysis
    
    const { value, deviceId } = reading;
    const { trend, anomaly, severity } = analysisResult;

    let aiInsight = `Temperature reading of ${value}°C for device ${deviceId}. `;
    
    if (anomaly) {
      aiInsight += `ANOMALY DETECTED: This reading is unusual compared to recent patterns. `;
    }
    
    if (trend === 'rising') {
      aiInsight += 'Temperature trend is rising. ';
    } else if (trend === 'falling') {
      aiInsight += 'Temperature trend is falling. ';
    } else {
      aiInsight += 'Temperature appears stable. ';
    }

    aiInsight += `Severity level: ${severity}.`;

    // TODO: Replace with actual OpenAI API call
    // const openAIResponse = await this.openAIService.analyze({
    //   temperature: value,
    //   trend,
    //   anomaly,
    //   context: analysisResult.context
    // });

    return aiInsight;
  }

  /**
   * Prepares data for blockchain submission
   */
  private prepareChainData(reading: any, analysis: any, aiAnalysis: string): any {
    return {
      deviceId: reading.deviceId,
      timestamp: reading.timestamp,
      temperature: {
        value: reading.value,
        unit: reading.unit,
      },
      location: reading.location,
      analysis: {
        trend: analysis.trend,
        anomaly: analysis.anomaly,
        severity: analysis.severity,
      },
      aiInsights: aiAnalysis,
      metadata: {
        processedAt: new Date(),
        version: '1.0',
      },
    };
  }

  /**
   * Submits processed data to blockchain/HCS topic
   */
  private async submitToChain(chainData: any): Promise<string> {
    try {
      // TODO: Implement actual chain submission using device's HCS topic
      // For now, simulate the submission
      
      this.logger.log('Submitting to chain:', JSON.stringify(chainData, null, 2));
      
      // TODO: Use device's HCS topic to submit data
      // const chain = this.smartConfigService.getChain();
      // const ledger = this.smartLedgersService.getAdapter(chain).getLedger();
      // const txHash = await ledger.submitToTopic(deviceTopic, chainData);
      
      // Simulate transaction hash
      const simulatedTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`;
      
      this.logger.log(`Simulated chain submission with hash: ${simulatedTxHash}`);
      
      return simulatedTxHash;

    } catch (error) {
      this.logger.error('Error submitting to chain:', error);
      throw error;
    }
  }

  /**
   * Calculates temperature trend from recent values
   */
  private calculateTrend(values: number[]): string {
    if (values.length < 3) return 'insufficient_data';
    
    const recent = values.slice(0, 3);
    const older = values.slice(3, 6);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 1) return 'rising';
    if (difference < -1) return 'falling';
    return 'stable';
  }

  /**
   * Detects temperature anomalies
   */
  private detectAnomaly(currentValue: number, recentValues: number[]): boolean {
    if (recentValues.length < 5) return false;
    
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const stdDev = this.calculateStandardDeviation(recentValues);
    
    // Consider it an anomaly if it's more than 2 standard deviations from the mean
    return Math.abs(currentValue - mean) > (2 * stdDev);
  }

  /**
   * Assesses the severity of the temperature reading
   */
  private assessSeverity(value: number, trend: string, anomaly: boolean): string {
    // Define temperature thresholds
    const EXTREME_COLD = 0;
    const COLD = 10;
    const HOT = 35;
    const EXTREME_HOT = 45;

    if (value <= EXTREME_COLD || value >= EXTREME_HOT) {
      return 'critical';
    }
    
    if (value <= COLD || value >= HOT) {
      return 'high';
    }
    
    if (anomaly) {
      return 'medium';
    }
    
    if (trend === 'rising' || trend === 'falling') {
      return 'low';
    }
    
    return 'normal';
  }

  /**
   * Calculates standard deviation of values
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    return Math.sqrt(avgSquaredDiff);
  }

  // ===== BATCH PROCESSING HELPER METHODS =====

  /**
   * Calculates trend for batch data by comparing first and last portions
   */
  private calculateBatchTrend(values: number[]): string {
    if (values.length < 4) return 'insufficient_data';
    
    const quarterSize = Math.floor(values.length / 4);
    const firstQuarter = values.slice(0, quarterSize);
    const lastQuarter = values.slice(-quarterSize);
    
    const firstAvg = firstQuarter.reduce((sum, val) => sum + val, 0) / firstQuarter.length;
    const lastAvg = lastQuarter.reduce((sum, val) => sum + val, 0) / lastQuarter.length;
    
    const difference = lastAvg - firstAvg;
    
    if (difference > 0.5) return 'rising';
    if (difference < -0.5) return 'falling';
    return 'stable';
  }

  /**
   * Detects outliers in batch data
   */
  private detectBatchOutliers(readings: any[], mean: number, stdDev: number): any[] {
    const threshold = 2; // 2 standard deviations
    
    return readings
      .filter(reading => Math.abs(reading.value - mean) > (threshold * stdDev))
      .map(reading => ({
        value: reading.value,
        timestamp: reading.timestamp,
        deviation: Math.abs(reading.value - mean) / stdDev,
      }));
  }

  /**
   * Assesses severity for batch analysis
   */
  private assessBatchSeverity(
    average: number, 
    minimum: number, 
    maximum: number, 
    outlierCount: number, 
    totalReadings: number
  ): string {
    const EXTREME_COLD = 0;
    const COLD = 10;
    const HOT = 35;
    const EXTREME_HOT = 45;
    const OUTLIER_RATIO_THRESHOLD = 0.2; // 20% outliers is concerning

    // Critical conditions
    if (minimum <= EXTREME_COLD || maximum >= EXTREME_HOT) {
      return 'critical';
    }
    
    // High severity conditions
    if (minimum <= COLD || maximum >= HOT) {
      return 'high';
    }
    
    // Check outlier ratio
    const outlierRatio = outlierCount / totalReadings;
    if (outlierRatio >= OUTLIER_RATIO_THRESHOLD) {
      return 'medium';
    }
    
    // Temperature range is too wide
    if (maximum - minimum > 10) {
      return 'medium';
    }
    
    // Minor issues
    if (outlierCount > 0 || maximum - minimum > 5) {
      return 'low';
    }
    
    return 'normal';
  }

  /**
   * Calculates stability score (0-1, higher is more stable)
   */
  private calculateStabilityScore(standardDeviation: number, range: number): number {
    // Normalize based on expected temperature variance
    const maxAcceptableStdDev = 3; // 3°C standard deviation is still acceptable
    const maxAcceptableRange = 10; // 10°C range is acceptable
    
    const stdDevScore = Math.max(0, 1 - (standardDeviation / maxAcceptableStdDev));
    const rangeScore = Math.max(0, 1 - (range / maxAcceptableRange));
    
    // Weighted average (std dev is more important for stability)
    return (stdDevScore * 0.7) + (rangeScore * 0.3);
  }

  /**
   * Generates predictions based on batch analysis
   */
  private generatePredictions(batchAnalysis: any, readings: any[]): any {
    const { trend, average, standardDeviation } = batchAnalysis;
    
    // Simple prediction logic (can be enhanced with ML)
    let nextHourTrend = trend;
    let confidence = 0.6; // Base confidence
    
    // Adjust confidence based on stability
    if (standardDeviation < 1) confidence += 0.2;
    if (standardDeviation > 3) confidence -= 0.2;
    
    // Predict expected range
    const buffer = Math.max(1, standardDeviation * 1.5);
    const expectedRange = {
      min: Math.round((average - buffer) * 100) / 100,
      max: Math.round((average + buffer) * 100) / 100,
    };
    
    // Ensure confidence is between 0 and 1
    confidence = Math.max(0.1, Math.min(1.0, confidence));
    
    return {
      nextHourTrend,
      expectedRange,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Generates warnings based on analysis and ML results
   */
  private generateWarnings(batchAnalysis: any, mlAnalysis?: any): string[] {
    const warnings: string[] = [];
    const { average, minimum, maximum, outliers, severity, stabilityScore } = batchAnalysis;
    
    if (severity === 'critical') {
      warnings.push('CRITICAL: Temperature readings are in dangerous range');
    }
    
    if (severity === 'high') {
      warnings.push('HIGH: Temperature readings are outside normal operating range');
    }
    
    if (outliers.length > 0) {
      warnings.push(`Detected ${outliers.length} unusual temperature readings`);
    }
    
    if (stabilityScore < 0.5) {
      warnings.push('Temperature readings are highly unstable');
    }
    
    if (maximum - minimum > 10) {
      warnings.push('Large temperature variation detected');
    }
    
    if (average < 5) {
      warnings.push('Very low average temperature detected');
    }
    
    if (average > 40) {
      warnings.push('Very high average temperature detected');
    }

    // Add ML-specific warnings
    if (mlAnalysis) {
      const { predictions, riskAssessment } = mlAnalysis;
      
      const mlAnomalies = predictions?.filter((p: any) => p.isAnomaly) || [];
      if (mlAnomalies.length > 0) {
        warnings.push(`ML model predicts ${mlAnomalies.length} anomalous readings ahead`);
      }
      
      if (riskAssessment === 'critical') {
        warnings.push('ML risk assessment indicates CRITICAL conditions');
      } else if (riskAssessment === 'high') {
        warnings.push('ML model indicates HIGH RISK temperature patterns');
      }
    }
    
    return warnings;
  }

  /**
   * Calculates trend slope (rate of change per hour)
   */
  private calculateTrendSlope(readings: any[]): number {
    if (readings.length < 2) return 0;
    
    const first = readings[0];
    const last = readings[readings.length - 1];
    
    const timeDiff = (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / (1000 * 60 * 60); // hours
    const tempDiff = last.value - first.value;
    
    if (timeDiff === 0) return 0;
    
    return Math.round((tempDiff / timeDiff) * 100) / 100; // °C per hour
  }
} 