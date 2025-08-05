/**
 * @module PiHealthAnalysisConsumer
 * @description Bull queue consumer for processing Pi health data with AI analysis
 * 
 * This consumer processes Pi health monitoring data in the background using Bull queues.
 * It performs AI-powered analysis to detect anomalies, predict failures, and generate
 * alerts for device maintenance.
 */

import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { PiHealthMLService } from '../pi-health-ml.service';
import { PiHealthService } from '../pi-health.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PiHealth, PiHealthDocument } from '../entities/pi-health.entity';

export interface PiHealthAnalysisJob {
  deviceId: string;
  healthData: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    temperature: number;
    timestamp: Date;
  };
  analysisType: 'anomaly_detection' | 'failure_prediction' | 'health_score';
}

export interface PiHealthRewardJob {
  deviceId: string;
  accountId: string;
  healthMetrics: any;
  rewardAmount: string;
}

/**
 * @class PiHealthAnalysisConsumer
 * @description Consumer for processing Pi health analysis jobs
 */
@Injectable()
@Processor('pi-health-analysis')
export class PiHealthAnalysisConsumer {
  private readonly logger = new Logger(PiHealthAnalysisConsumer.name);

  constructor(
    private readonly piHealthMlService: PiHealthMLService,
    private readonly piHealthService: PiHealthService,
    @InjectModel(PiHealth.name) private piHealthModel: Model<PiHealthDocument>
  ) {}

  /**
   * Process anomaly detection job
   */
  @Process('anomaly-detection')
  async processAnomalyDetection(job: Job<PiHealthAnalysisJob>): Promise<void> {
    const { deviceId, healthData } = job.data;
    
    this.logger.log(`Processing anomaly detection for device ${deviceId}`);

    try {
      // Perform ML-based anomaly detection
      const anomalyResult = await this.piHealthMlService.detectAnomalies(
        deviceId,
        healthData.cpuUsage,
        healthData.memoryUsage,
        healthData.diskUsage,
        healthData.temperature
      );

      // Store analysis results
      await this.piHealthService.storeAnalysisResult(deviceId, {
        type: 'anomaly_detection',
        result: anomalyResult,
        timestamp: new Date(),
        inputData: healthData
      });

      // If anomaly detected, trigger alert
      if (anomalyResult.isAnomaly) {
        await this.triggerHealthAlert(deviceId, 'anomaly', anomalyResult);
      }

      this.logger.log(`Anomaly detection completed for device ${deviceId}: ${anomalyResult.isAnomaly ? 'Anomaly detected' : 'Normal'}`);
    } catch (error) {
      this.logger.error(`Failed to process anomaly detection for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Process failure prediction job
   */
  @Process('failure-prediction')
  async processFailurePrediction(job: Job<PiHealthAnalysisJob>): Promise<void> {
    const { deviceId, healthData } = job.data;
    
    this.logger.log(`Processing failure prediction for device ${deviceId}`);

    try {
      // Get historical data for prediction
      const historicalData = await this.piHealthService.getHistoricalData(deviceId, 24); // Last 24 hours

      // Perform ML-based failure prediction
      const predictionResult = await this.piHealthMlService.predictFailure(deviceId, historicalData);

      // Store prediction results
      await this.piHealthService.storeAnalysisResult(deviceId, {
        type: 'failure_prediction',
        result: predictionResult,
        timestamp: new Date(),
        inputData: healthData
      });

      // If high failure risk, trigger alert
      if (predictionResult.riskLevel === 'high') {
        await this.triggerHealthAlert(deviceId, 'failure_risk', predictionResult);
      }

      this.logger.log(`Failure prediction completed for device ${deviceId}: Risk level ${predictionResult.riskLevel}`);
    } catch (error) {
      this.logger.error(`Failed to process failure prediction for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Process health score calculation job
   */
  @Process('health-score')
  async processHealthScore(job: Job<PiHealthAnalysisJob>): Promise<void> {
    const { deviceId, healthData } = job.data;
    
    this.logger.log(`Calculating health score for device ${deviceId}`);

    try {
      // Calculate comprehensive health score
      const healthScore = await this.piHealthMlService.calculateHealthScore(deviceId, healthData);

      // Store health score
      await this.piHealthService.updateDeviceHealthScore(deviceId, healthScore);

      this.logger.log(`Health score calculated for device ${deviceId}: ${healthScore.score}/100`);
    } catch (error) {
      this.logger.error(`Failed to calculate health score for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Process blockchain reward submission for health monitoring
   */
  @Process('health-reward')
  async processHealthReward(job: Job<PiHealthRewardJob>): Promise<void> {
    const { deviceId, accountId, healthMetrics, rewardAmount } = job.data;
    
    this.logger.log(`Processing health monitoring reward for device ${deviceId}`);

    try {
      // Submit health data to blockchain and claim reward
      const result = await this.piHealthService.submitHealthDataToBlockchain(
        deviceId,
        accountId,
        healthMetrics,
        rewardAmount
      );

      this.logger.log(`Health monitoring reward processed for device ${deviceId}: ${result.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      this.logger.error(`Failed to process health reward for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger health alert for critical issues
   */
  private async triggerHealthAlert(deviceId: string, alertType: string, data: any): Promise<void> {
    this.logger.warn(`Health alert triggered for device ${deviceId}: ${alertType}`, data);
    
    // Here you could implement various alert mechanisms:
    // - Email notifications
    // - Webhook calls
    // - Database logging for dashboard
    // - Push notifications
    
    // For now, just log the alert
    await this.piHealthService.logHealthAlert(deviceId, alertType, data);
  }
}