/**
 * @module TemperatureAnalysisConsumer
 * @description Bull queue consumer for processing temperature sensor data with AI analysis
 * 
 * This consumer processes temperature sensor data in the background using Bull queues.
 * It performs AI-powered analysis including trend detection, anomaly identification,
 * environmental pattern recognition, and blockchain reward processing.
 */

import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { TemperatureMachineLearningService } from './temperature-ml.service';
import { TemperatureSensorService } from './temperature-sensor.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TemperatureReading } from './entities/temperature-reading.entity';
import { TemperatureAnalysis } from './entities/temperature-analysis.entity';
import { DHT11Reading } from './entities/dht11-reading.entity';

export interface TemperatureAnalysisJob {
  deviceId: string;
  temperatureData: {
    temperature: number;
    humidity: number;
    heatIndex: number;
    timestamp: Date;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
  analysisType: 'trend_analysis' | 'anomaly_detection' | 'pattern_recognition' | 'environmental_impact';
}

export interface TemperatureRewardJob {
  deviceId: string;
  accountId: string;
  temperatureReadings: any[];
  analysisResults: any;
  rewardAmount: string;
}

export interface ClimateDataSubmissionJob {
  deviceId: string;
  accountId: string;
  aggregatedData: {
    avgTemperature: number;
    avgHumidity: number;
    readings: number;
    anomalies: number;
    trends: any[];
  };
  submissionPeriod: {
    start: Date;
    end: Date;
  };
}

export interface DHT11AnalysisJob {
  deviceId: string;
  batchId: string;
  timestamp: Date;
}

/**
 * @class TemperatureAnalysisConsumer
 * @description Consumer for processing temperature sensor analysis jobs
 */
@Injectable()
@Processor('temperature-analysis')
export class TemperatureAnalysisConsumer {
  private readonly logger = new Logger(TemperatureAnalysisConsumer.name);

  constructor(
    private readonly temperatureMlService: TemperatureMachineLearningService,
    private readonly temperatureSensorService: TemperatureSensorService,
    @InjectModel(TemperatureReading.name) private temperatureReadingModel: Model<TemperatureReading>,
    @InjectModel(TemperatureAnalysis.name) private temperatureAnalysisModel: Model<TemperatureAnalysis>,
    @InjectModel(DHT11Reading.name) private dht11ReadingModel: Model<DHT11Reading>
  ) {}

  /**
   * Process temperature trend analysis
   */
  @Process('trend-analysis')
  async processTrendAnalysis(job: Job<TemperatureAnalysisJob>): Promise<void> {
    const { deviceId, temperatureData } = job.data;
    
    this.logger.log(`Processing trend analysis for device ${deviceId}`);

    try {
      // Get historical data for trend analysis
      const historicalData = await this.temperatureSensorService.getHistoricalReadings(deviceId, 168); // Last 7 days

      // Perform ML-based trend analysis
      const trendResult = await this.temperatureMlService.analyzeTrends(deviceId, historicalData);

      // Store analysis results
      await this.temperatureAnalysisModel.create({
        deviceId,
        analysisType: 'trend_analysis',
        result: trendResult,
        timestamp: new Date(),
        inputData: temperatureData
      });

      this.logger.log(`Trend analysis completed for device ${deviceId}: ${trendResult.trends.length} trends identified`);
    } catch (error) {
      this.logger.error(`Failed to process trend analysis for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Process temperature anomaly detection
   */
  @Process('anomaly-detection')
  async processAnomalyDetection(job: Job<TemperatureAnalysisJob>): Promise<void> {
    const { deviceId, temperatureData } = job.data;
    
    this.logger.log(`Processing anomaly detection for device ${deviceId}`);

    try {
      // Perform ML-based anomaly detection
      const anomalyResult = await this.temperatureMlService.detectAnomalies(
        deviceId,
        temperatureData.temperature,
        temperatureData.humidity
      );

      // Store analysis results
      await this.temperatureAnalysisModel.create({
        deviceId,
        analysisType: 'anomaly_detection',
        result: anomalyResult,
        timestamp: new Date(),
        inputData: temperatureData
      });

      // If significant anomaly, trigger alert
      if (anomalyResult.severity === 'high') {
        await this.triggerClimateAlert(deviceId, 'temperature_anomaly', anomalyResult);
      }

      this.logger.log(`Anomaly detection completed for device ${deviceId}: ${anomalyResult.isAnomaly ? 'Anomaly detected' : 'Normal'}`);
    } catch (error) {
      this.logger.error(`Failed to process anomaly detection for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Process environmental pattern recognition
   */
  @Process('pattern-recognition')
  async processPatternRecognition(job: Job<TemperatureAnalysisJob>): Promise<void> {
    const { deviceId, temperatureData } = job.data;
    
    this.logger.log(`Processing pattern recognition for device ${deviceId}`);

    try {
      // Get extended historical data for pattern analysis
      const historicalData = await this.temperatureSensorService.getHistoricalReadings(deviceId, 720); // Last 30 days

      // Perform ML-based pattern recognition
      const patternResult = await this.temperatureMlService.recognizePatterns(deviceId, historicalData);

      // Store pattern analysis results
      await this.temperatureAnalysisModel.create({
        deviceId,
        analysisType: 'pattern_recognition',
        result: patternResult,
        timestamp: new Date(),
        inputData: temperatureData
      });

      this.logger.log(`Pattern recognition completed for device ${deviceId}: ${patternResult.patterns.length} patterns identified`);
    } catch (error) {
      this.logger.error(`Failed to process pattern recognition for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Process environmental impact analysis
   */
  @Process('environmental-impact')
  async processEnvironmentalImpact(job: Job<TemperatureAnalysisJob>): Promise<void> {
    const { deviceId, temperatureData } = job.data;
    
    this.logger.log(`Processing environmental impact analysis for device ${deviceId}`);

    try {
      // Analyze environmental impact based on temperature data
      const impactResult = await this.temperatureMlService.analyzeEnvironmentalImpact(
        deviceId,
        temperatureData,
        temperatureData.location
      );

      // Store impact analysis results
      await this.temperatureAnalysisModel.create({
        deviceId,
        analysisType: 'environmental_impact',
        result: impactResult,
        timestamp: new Date(),
        inputData: temperatureData
      });

      this.logger.log(`Environmental impact analysis completed for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to process environmental impact analysis for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Process climate data submission to blockchain for rewards
   */
  @Process('climate-data-submission')
  async processClimateDataSubmission(job: Job<ClimateDataSubmissionJob>): Promise<void> {
    const { deviceId, accountId, aggregatedData, submissionPeriod } = job.data;
    
    this.logger.log(`Processing climate data submission for device ${deviceId}`);

    try {
      // Submit aggregated climate data to blockchain
      const submissionResult = await this.temperatureSensorService.submitClimateDataToBlockchain(
        deviceId,
        accountId,
        aggregatedData,
        submissionPeriod
      );

      this.logger.log(`Climate data submission completed for device ${deviceId}: ${submissionResult.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      this.logger.error(`Failed to process climate data submission for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Process temperature monitoring reward
   */
  @Process('temperature-reward')
  async processTemperatureReward(job: Job<TemperatureRewardJob>): Promise<void> {
    const { deviceId, accountId, temperatureReadings, analysisResults, rewardAmount } = job.data;
    
    this.logger.log(`Processing temperature monitoring reward for device ${deviceId}`);

    try {
      // Calculate reward based on data quality and analysis results
      const qualityScore = await this.temperatureMlService.calculateDataQuality(temperatureReadings);
      
      // Adjust reward based on data quality
      const adjustedReward = this.calculateAdjustedReward(rewardAmount, qualityScore, analysisResults);

      // Submit reward transaction to blockchain
      const rewardResult = await this.temperatureSensorService.claimTemperatureReward(
        deviceId,
        accountId,
        adjustedReward,
        qualityScore
      );

      this.logger.log(`Temperature reward processed for device ${deviceId}: ${rewardResult.success ? `${adjustedReward} tokens` : 'Failed'}`);
    } catch (error) {
      this.logger.error(`Failed to process temperature reward for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate adjusted reward based on data quality and analysis results
   */
  private calculateAdjustedReward(baseReward: string, qualityScore: number, analysisResults: any): string {
    const baseAmount = parseFloat(baseReward);
    
    // Apply quality multiplier (0.5x to 2.0x based on quality)
    const qualityMultiplier = Math.max(0.5, Math.min(2.0, qualityScore / 50));
    
    // Bonus for anomaly detection
    const anomalyBonus = analysisResults.anomaliesDetected ? 1.2 : 1.0;
    
    // Bonus for pattern contributions
    const patternBonus = analysisResults.patternsContributed ? 1.1 : 1.0;
    
    const adjustedAmount = baseAmount * qualityMultiplier * anomalyBonus * patternBonus;
    
    return adjustedAmount.toFixed(2);
  }

  /**
   * Trigger climate alert for significant events
   */
  private async triggerClimateAlert(deviceId: string, alertType: string, data: any): Promise<void> {
    this.logger.warn(`Climate alert triggered for device ${deviceId}: ${alertType}`, data);
    
    // Log climate alert for further processing
    await this.temperatureSensorService.logClimateAlert(deviceId, alertType, data);
  }

  // ==================== DHT11 ANALYSIS METHODS ====================

  /**
   * Process DHT11 sensor data analysis
   */
  @Process('dht11-analysis')
  async processDHT11Analysis(job: Job<DHT11AnalysisJob>): Promise<void> {
    const { deviceId, batchId, timestamp } = job.data;
    
    this.logger.log(`Processing DHT11 analysis for device ${deviceId}, batch: ${batchId}`);

    try {
      // Get recent DHT11 readings for analysis
      const readings = await this.dht11ReadingModel.find({
        deviceId,
        processed: { $ne: true }
      }).sort({ timestamp: 1 }).limit(10).exec();

      if (readings.length === 0) {
        this.logger.log(`No unprocessed DHT11 readings for device ${deviceId}`);
        return;
      }

      // Perform analysis on temperature and humidity data
      const temperatureData = readings.map(r => r.temperature);
      const humidityData = readings.map(r => r.humidity);

      // Calculate basic statistics
      const avgTemperature = temperatureData.reduce((sum, temp) => sum + temp, 0) / temperatureData.length;
      const avgHumidity = humidityData.reduce((sum, hum) => sum + hum, 0) / humidityData.length;
      
      const tempMin = Math.min(...temperatureData);
      const tempMax = Math.max(...temperatureData);
      const humidityMin = Math.min(...humidityData);
      const humidityMax = Math.max(...humidityData);

      // Detect anomalies (simple threshold-based for now)
      const tempAnomalies = temperatureData.filter(temp => temp < 10 || temp > 40).length;
      const humidityAnomalies = humidityData.filter(hum => hum < 20 || hum > 90).length;

      // Create analysis result
      const analysisResult = {
        deviceId,
        batchId,
        timestamp: new Date(),
        readingsAnalyzed: readings.length,
        temperature: {
          average: avgTemperature,
          min: tempMin,
          max: tempMax,
          range: tempMax - tempMin,
          anomalies: tempAnomalies,
        },
        humidity: {
          average: avgHumidity,
          min: humidityMin,
          max: humidityMax,
          range: humidityMax - humidityMin,
          anomalies: humidityAnomalies,
        },
        environmentalConditions: {
          heatIndex: this.calculateHeatIndex(avgTemperature, avgHumidity),
          comfortLevel: this.calculateComfortLevel(avgTemperature, avgHumidity),
          riskLevel: this.calculateRiskLevel(tempAnomalies, humidityAnomalies),
        },
        recommendations: this.generateRecommendations(avgTemperature, avgHumidity, tempAnomalies, humidityAnomalies),
      };

      // Mark readings as processed
      await this.dht11ReadingModel.updateMany(
        { _id: { $in: readings.map(r => r._id) } },
        { processed: true }
      );

      // Store analysis result
      await this.temperatureAnalysisModel.create({
        deviceId,
        analysisType: 'dht11_analysis',
        result: analysisResult,
        timestamp: new Date(),
        inputData: {
          readings: readings.length,
          temperatureRange: [tempMin, tempMax],
          humidityRange: [humidityMin, humidityMax],
        }
      });

      this.logger.log(`DHT11 analysis completed for device ${deviceId}: ${readings.length} readings analyzed`);
      
      // Trigger alerts if anomalies detected
      if (tempAnomalies > 0 || humidityAnomalies > 0) {
        await this.triggerClimateAlert(deviceId, 'dht11_anomaly_detected', analysisResult);
      }

    } catch (error) {
      this.logger.error(`Failed to process DHT11 analysis for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate heat index based on temperature and humidity
   */
  private calculateHeatIndex(temperature: number, humidity: number): number {
    // Simplified heat index calculation
    if (temperature < 27) {
      return temperature; // No heat index for temperatures below 27°C
    }
    
    // Basic heat index formula
    const heatIndex = temperature + 0.5 * humidity;
    return Math.min(heatIndex, 60); // Cap at 60°C
  }

  /**
   * Calculate comfort level based on temperature and humidity
   */
  private calculateComfortLevel(temperature: number, humidity: number): string {
    if (temperature >= 18 && temperature <= 24 && humidity >= 30 && humidity <= 60) {
      return 'comfortable';
    } else if (temperature < 18 || temperature > 24) {
      return 'temperature_uncomfortable';
    } else if (humidity < 30 || humidity > 60) {
      return 'humidity_uncomfortable';
    } else {
      return 'moderate';
    }
  }

  /**
   * Calculate risk level based on anomalies
   */
  private calculateRiskLevel(tempAnomalies: number, humidityAnomalies: number): string {
    const totalAnomalies = tempAnomalies + humidityAnomalies;
    
    if (totalAnomalies === 0) {
      return 'low';
    } else if (totalAnomalies <= 2) {
      return 'moderate';
    } else {
      return 'high';
    }
  }

  /**
   * Generate recommendations based on environmental conditions
   */
  private generateRecommendations(
    avgTemperature: number, 
    avgHumidity: number, 
    tempAnomalies: number, 
    humidityAnomalies: number
  ): string[] {
    const recommendations: string[] = [];

    if (avgTemperature < 18) {
      recommendations.push('Consider increasing temperature for comfort');
    } else if (avgTemperature > 24) {
      recommendations.push('Consider cooling measures to reduce temperature');
    }

    if (avgHumidity < 30) {
      recommendations.push('Low humidity detected - consider humidification');
    } else if (avgHumidity > 60) {
      recommendations.push('High humidity detected - consider dehumidification');
    }

    if (tempAnomalies > 0) {
      recommendations.push('Temperature anomalies detected - check sensor calibration');
    }

    if (humidityAnomalies > 0) {
      recommendations.push('Humidity anomalies detected - check sensor placement');
    }

    return recommendations;
  }
}