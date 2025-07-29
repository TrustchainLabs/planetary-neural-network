import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TemperatureReading } from './entities/temperature-reading.entity';
import { TemperatureAnalysis } from './entities/temperature-analysis.entity';
import { CreateTemperatureReadingDto } from './dto/create-temperature-reading.dto';
import { ReadTemperatureReadingsDto } from './dto/read-temperature-readings.dto';

@Injectable()
export class TemperatureSensorModelService {
  constructor(
    @InjectModel(TemperatureReading.name)
    private readonly temperatureReadingModel: Model<TemperatureReading>,
    @InjectModel(TemperatureAnalysis.name)
    private readonly temperatureAnalysisModel: Model<TemperatureAnalysis>,
  ) {}

  /**
   * Creates a new temperature reading in the database
   */
  async create(createDto: CreateTemperatureReadingDto): Promise<TemperatureReading> {
    const reading = new this.temperatureReadingModel(createDto);
    return await reading.save();
  }

  /**
   * Finds temperature readings based on filters
   */
  async findAll(filters: ReadTemperatureReadingsDto): Promise<TemperatureReading[]> {
    const {
      deviceId,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
      processedOnly,
      includeAiAnalysis,
    } = filters;

    let query: any = {};

    // Device filter
    if (deviceId) {
      query.deviceId = deviceId;
    }

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Processed filter
    if (processedOnly !== undefined) {
      query.processed = processedOnly;
    }

    let queryBuilder = this.temperatureReadingModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset);

    // Exclude AI analysis if not requested
    if (!includeAiAnalysis) {
      queryBuilder = queryBuilder.select('-aiAnalysis');
    }

    return await queryBuilder.exec();
  }

  /**
   * Finds a single temperature reading by ID
   */
  async findById(id: string): Promise<TemperatureReading | null> {
    return await this.temperatureReadingModel.findById(id).exec();
  }

  /**
   * Finds the latest temperature reading for a device
   */
  async findLatest(deviceId: string): Promise<TemperatureReading | null> {
    return await this.temperatureReadingModel
      .findOne({ deviceId })
      .sort({ timestamp: -1 })
      .exec();
  }

  /**
   * Updates a temperature reading
   */
  async update(
    id: string,
    updateData: Partial<TemperatureReading>,
  ): Promise<TemperatureReading | null> {
    return await this.temperatureReadingModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  /**
   * Marks a reading as processed
   */
  async markAsProcessed(id: string, aiAnalysis?: string, chainTxHash?: string): Promise<TemperatureReading | null> {
    const updateData: any = { processed: true };
    
    if (aiAnalysis) {
      updateData.aiAnalysis = aiAnalysis;
    }
    
    if (chainTxHash) {
      updateData.chainTxHash = chainTxHash;
    }

    return await this.update(id, updateData);
  }

  /**
   * Deletes a temperature reading
   */
  async remove(id: string): Promise<TemperatureReading | null> {
    return await this.temperatureReadingModel.findByIdAndDelete(id).exec();
  }

  /**
   * Gets count of readings for a device
   */
  async getCount(deviceId?: string): Promise<number> {
    const query = deviceId ? { deviceId } : {};
    return await this.temperatureReadingModel.countDocuments(query).exec();
  }

  /**
   * Gets count of unprocessed readings for a device
   */
  async getUnprocessedCount(deviceId: string): Promise<number> {
    return await this.temperatureReadingModel.countDocuments({
      deviceId,
      processed: { $ne: true }
    }).exec();
  }

  /**
   * Gets readings aggregated by time intervals (for charts/analytics)
   */
  async getAggregatedData(
    deviceId: string,
    intervalMinutes: number = 60,
    hours: number = 24,
  ): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (hours * 60 * 60 * 1000));

    return await this.temperatureReadingModel.aggregate([
      {
        $match: {
          deviceId,
          timestamp: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:%M',
              date: {
                $dateFromParts: {
                  year: { $year: '$timestamp' },
                  month: { $month: '$timestamp' },
                  day: { $dayOfMonth: '$timestamp' },
                  hour: { $hour: '$timestamp' },
                  minute: {
                    $multiply: [
                      { $floor: { $divide: [{ $minute: '$timestamp' }, intervalMinutes] } },
                      intervalMinutes,
                    ],
                  },
                },
              },
            },
          },
          avgTemperature: { $avg: '$value' },
          minTemperature: { $min: '$value' },
          maxTemperature: { $max: '$value' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
  }

  /**
   * Gets unprocessed readings for batch processing
   */
  async getUnprocessedReadings(deviceId: string, limit: number): Promise<TemperatureReading[]> {
    return await this.temperatureReadingModel
      .find({ 
        deviceId, 
        processed: { $ne: true } 
      })
      .sort({ timestamp: 1 }) // Oldest first for batch processing
      .limit(limit)
      .exec();
  }

  /**
   * Marks multiple readings as processed (used after batch analysis)
   */
  async markBatchAsProcessed(readingIds: string[]): Promise<void> {
    await this.temperatureReadingModel.updateMany(
      { _id: { $in: readingIds } },
      { processed: true }
    ).exec();
  }

  // ===== TEMPERATURE ANALYSIS METHODS =====

  /**
   * Creates a new temperature analysis result
   */
  async createAnalysis(analysisData: Partial<TemperatureAnalysis>): Promise<TemperatureAnalysis> {
    const analysis = new this.temperatureAnalysisModel(analysisData);
    return await analysis.save();
  }

  /**
   * Finds temperature analyses with filters
   */
  async findAnalyses(deviceId?: string, limit: number = 50): Promise<TemperatureAnalysis[]> {
    const query = deviceId ? { deviceId } : {};
    return await this.temperatureAnalysisModel
      .find(query)
      .sort({ analysisTimestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Gets the latest temperature analysis for a device
   */
  async getLatestAnalysis(deviceId: string): Promise<TemperatureAnalysis | null> {
    return await this.temperatureAnalysisModel
      .findOne({ deviceId })
      .sort({ analysisTimestamp: -1 })
      .exec();
  }

  /**
   * Updates an analysis with chain transaction hash
   */
  async updateAnalysisWithChainTx(analysisId: string, chainTxHash: string): Promise<TemperatureAnalysis | null> {
    return await this.temperatureAnalysisModel
      .findByIdAndUpdate(analysisId, { chainTxHash }, { new: true })
      .exec();
  }
} 