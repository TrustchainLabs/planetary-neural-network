# Licor + Hedera Guardian Integration Plan

## Overview
Integrate Licor environmental monitoring systems via **API-only** approach and implement **real Hedera Guardian MRV workflow** using external data blocks, schemas, and verifiable credentials for carbon credit verification.

## Key Clarifications
- ✅ **Licor Integration**: API-only (no hardware/serial drivers)
- ✅ **Guardian Integration**: Real API integration (not mock)
- ✅ **Pattern**: Guardian Pattern A - Push raw JSON to externalDataBlock
- ✅ **Flow**: Licor API → Backend → Guardian Policy → VC → IPFS → Hedera

---

## Phase 1: Licor API Integration Layer

### 1.1 Extend Unit Enumerations
**File**: `backend/src/shared/enums/index.ts`

Add Licor-specific units:
```typescript
export enum Unit {
  // Existing
  CELCIUS = '°C',
  DEGREE = '°',
  KM_P_H = 'Km/h',
  ATM = 'Atm',
  AQI = 'AQI',
  
  // Licor additions
  PPM = 'ppm',                    // CO2/CH4 concentration
  UMOL_M2_S = 'μmol/m²/s',        // Carbon flux
  MM_H2O = 'mm H2O',              // Evapotranspiration
  W_M2 = 'W/m²',                  // Heat flux
  G_CO2_M2_H = 'g CO2/m²/h',      // Soil respiration
  PERCENT = '%',                   // Humidity/soil moisture
}
```

### 1.2 Create Licor Data Schemas
**New files in**: `backend/src/shared/schemas/`

- `carbon-flux.schema.ts`: CO2 exchange rates
- `methane-flux.schema.ts`: CH4 measurements
- `evapotranspiration.schema.ts`: Water vapor exchange
- `heat-flux.schema.ts`: Energy exchange
- `soil-respiration.schema.ts`: Soil CO2 emissions

Each schema includes:
- value, unit, timestamp, deviceId
- location (lat/lon)
- measurement metadata (quality flags, calibration)

### 1.3 Create Licor Reading Entities
**New files in**: `backend/src/modules/sensors/entities/`

Pattern (similar to `temperature-reading.entity.ts`):
```typescript
@Schema({ collection: 'licor_carbon_readings', timestamps: true })
export class LicorCarbonReading extends Document {
  @Prop({ required: true }) deviceId: string;
  @Prop({ required: true }) value: number;
  @Prop({ required: true, enum: Unit }) unit: Unit;
  @Prop({ required: true }) timestamp: Date;
  @Prop({ required: false }) processed?: boolean;
  @Prop({ required: false }) guardianVcId?: string;  // Link to Guardian VC
  @Prop({ required: false }) ipfsCid?: string;        // IPFS hash
  @Prop({ type: Object }) location?: { latitude: number; longitude: number };
  @Prop({ type: Object }) metadata?: {
    instrument_model: string;
    calibration_id: string;
    measurement_quality: string;
  };
}
```

Create for all 5 Licor measurement types.

### 1.4 Licor API Client Service
**New file**: `backend/src/modules/sensors/licor-api-client.service.ts`

```typescript
@Injectable()
export class LicorApiClientService {
  private readonly licorApiUrl: string;
  private readonly apiKey: string;
  
  // Methods:
  async authenticate(): Promise<string>
  async getDeviceList(): Promise<LicorDevice[]>
  async getLatestReadings(deviceId: string): Promise<LicorReading[]>
  async getHistoricalData(deviceId: string, start: Date, end: Date): Promise<LicorReading[]>
  async getDeviceStatus(deviceId: string): Promise<DeviceStatus>
  async subscribeToWebhook(callbackUrl: string): Promise<void>  // If Licor supports webhooks
}
```

### 1.5 Update Device Entity
**File**: `backend/src/modules/devices/entities/device.entity.ts`

Add fields:
```typescript
@Prop({ required: false, enum: DeviceType })
deviceType?: DeviceType;  // RASPBERRY_PI_DHT11 | LICOR_EDDY_COVARIANCE | LICOR_SOIL_FLUX | LICOR_TRACE_GAS

@Prop({ type: [String], required: false })
capabilities?: string[];  // ['co2_flux', 'ch4_flux', 'evapotranspiration']

@Prop({ type: Object, required: false })
licorConfig?: {
  apiDeviceId: string;      // Licor's device identifier
  apiEndpoint?: string;      // Custom endpoint if needed
  pollingInterval?: number;  // Minutes between API polls
  dataRetentionDays?: number;
};
```

---

## Phase 2: Guardian Integration Foundation

### 2.1 Guardian Schema Definitions
**New file**: `backend/src/modules/guardian/schemas/licor-device-reading.guardian-schema.json`

Guardian schema JSON for validation:
```json
{
  "$id": "ecosphere-licor-device-reading",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Ecosphere Licor Device Reading",
  "description": "Environmental measurement from Licor monitoring system",
  "type": "object",
  "properties": {
    "device_did": {
      "type": "string",
      "description": "Hedera DID for the device"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "metric": {
      "type": "string",
      "enum": ["co2_flux", "ch4_flux", "evapotranspiration", "heat_flux", "soil_respiration"]
    },
    "value": {
      "type": "number"
    },
    "unit": {
      "type": "string"
    },
    "location": {
      "type": "object",
      "properties": {
        "lat": { "type": "number", "minimum": -90, "maximum": 90 },
        "lon": { "type": "number", "minimum": -180, "maximum": 180 }
      },
      "required": ["lat", "lon"]
    },
    "calibration_id": {
      "type": "string"
    },
    "measurement_metadata": {
      "type": "object",
      "properties": {
        "instrument_model": { "type": "string" },
        "measurement_quality": { "type": "string" }
      }
    }
  },
  "required": ["device_did", "timestamp", "metric", "value", "unit", "location"]
}
```

### 2.2 Guardian DID Manager Service
**New file**: `backend/src/modules/guardian/did-manager.service.ts`

```typescript
@Injectable()
export class DIDManagerService {
  // Generate DID for new device
  async generateDeviceDID(deviceId: string): Promise<DeviceDID>
  
  // Get DID for existing device
  async getDeviceDID(deviceId: string): Promise<string>
  
  // Resolve DID to public key
  async resolveDID(did: string): Promise<PublicKeyInfo>
  
  // Store DID mapping
  async storeDIDMapping(deviceId: string, did: string, keys: KeyPair): Promise<void>
}
```

### 2.3 Guardian API Client Service
**New file**: `backend/src/modules/guardian/guardian-api.service.ts`

```typescript
@Injectable()
export class GuardianApiService {
  private guardianUrl: string;
  private policyId: string;
  private bearerToken: string;
  
  // Authentication
  async authenticate(username: string, password: string): Promise<string>
  
  // Policy operations
  async getPolicyBlocks(policyId: string): Promise<PolicyBlock[]>
  async getBlockByTag(policyId: string, tag: string): Promise<PolicyBlock>
  
  // Data submission (Pattern A: raw JSON)
  async submitExternalData(
    policyId: string,
    blockTag: string,  // e.g., 'mrv_source'
    data: GuardianPayload
  ): Promise<SubmissionResult>
  
  // Query results
  async getVCsByDevice(deviceDid: string): Promise<VerifiableCredential[]>
  async getIPFSDocument(cid: string): Promise<any>
  async getBlockStatus(policyId: string, blockId: string): Promise<BlockStatus>
}
```

### 2.4 Guardian Data Transformer Service
**New file**: `backend/src/modules/guardian/data-transformer.service.ts`

```typescript
@Injectable()
export class GuardianDataTransformerService {
  // Transform Licor reading to Guardian payload
  licorToGuardianPayload(
    reading: LicorCarbonReading | LicorMethaneReading | ...,
    deviceDid: string
  ): GuardianPayload {
    return {
      device_did: deviceDid,
      timestamp: reading.timestamp.toISOString(),
      metric: this.mapMetricType(reading),
      value: reading.value,
      unit: reading.unit,
      location: {
        lat: reading.location.latitude,
        lon: reading.location.longitude
      },
      calibration_id: reading.metadata.calibration_id,
      measurement_metadata: {
        instrument_model: reading.metadata.instrument_model,
        measurement_quality: reading.metadata.measurement_quality
      }
    };
  }
  
  // Aggregate readings for MRV batch
  async aggregateReadingsForMRV(
    deviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MRVBatchData>
  
  // Calculate net carbon balance
  calculateCarbonBalance(readings: LicorCarbonReading[]): CarbonBalance
  
  // Pre-submission schema validation
  validateSchemaCompliance(payload: any, schema: any): ValidationResult
}
```

### 2.5 Guardian Submission Orchestrator
**New file**: `backend/src/modules/guardian/guardian-submission.service.ts`

```typescript
@Injectable()
export class GuardianSubmissionService {
  constructor(
    private guardianApi: GuardianApiService,
    private dataTransformer: GuardianDataTransformerService,
    private didManager: DIDManagerService
  ) {}
  
  // Submit single reading to Guardian
  async submitReading(reading: LicorReading): Promise<GuardianSubmission> {
    // 1. Get device DID
    const deviceDid = await this.didManager.getDeviceDID(reading.deviceId);
    
    // 2. Transform to Guardian format
    const payload = this.dataTransformer.licorToGuardianPayload(reading, deviceDid);
    
    // 3. Validate schema
    const validation = this.dataTransformer.validateSchemaCompliance(payload, schema);
    if (!validation.valid) throw new Error('Schema validation failed');
    
    // 4. Submit to Guardian external data block
    const result = await this.guardianApi.submitExternalData(
      this.policyId,
      'mrv_source',  // block tag
      payload
    );
    
    // 5. Save submission record
    return await this.saveSubmissionRecord(reading.id, result);
  }
  
  // Batch submission for MRV reporting
  async submitMRVBatch(deviceId: string, startDate: Date, endDate: Date): Promise<MRVBatch>
}
```

### 2.6 Guardian Entities
**New files in**: `backend/src/modules/guardian/entities/`

**device-did.entity.ts**:
```typescript
@Schema({ collection: 'device_dids', timestamps: true })
export class DeviceDID extends Document {
  @Prop({ required: true, unique: true }) deviceId: string;
  @Prop({ required: true, unique: true }) did: string;
  @Prop({ required: true }) publicKey: string;
  @Prop({ required: true }) privateKey: string;  // Encrypted
  @Prop({ required: false }) network: string;    // testnet/mainnet
  @Prop({ required: false }) status: string;     // active/revoked
}
```

**guardian-submission.entity.ts**:
```typescript
@Schema({ collection: 'guardian_submissions', timestamps: true })
export class GuardianSubmission extends Document {
  @Prop({ required: true }) submissionId: string;
  @Prop({ required: true }) deviceId: string;
  @Prop({ required: true }) readingId: string;
  @Prop({ required: true }) policyId: string;
  @Prop({ required: true }) blockTag: string;
  @Prop({ type: Object, required: true }) payload: any;
  @Prop({ required: false }) status: string;  // pending/success/failed
  @Prop({ required: false }) guardianVcId?: string;
  @Prop({ required: false }) ipfsCid?: string;
  @Prop({ required: false }) hederaTxId?: string;
  @Prop({ required: false }) error?: string;
}
```

**mrv-batch.entity.ts**:
```typescript
@Schema({ collection: 'mrv_batches', timestamps: true })
export class MRVBatch extends Document {
  @Prop({ required: true }) batchId: string;
  @Prop({ type: [String], required: true }) deviceIds: string[];
  @Prop({ required: true }) startDate: Date;
  @Prop({ required: true }) endDate: Date;
  @Prop({ required: true }) status: string;
  @Prop({ required: true }) totalReadings: number;
  @Prop({ type: [String], required: false }) vcIds: string[];
  @Prop({ type: Object, required: false }) carbonBalance?: {
    totalSequestration: number;
    totalEmissions: number;
    netBalance: number;
    unit: string;
  };
}
```

---

## Phase 3: Data Collection & Processing Pipeline

### 3.1 Licor Data Collection Service
**Update**: `backend/src/modules/sensors/data-collection.service.ts`

Add Licor-specific collection:
```typescript
// Poll Licor API for new data
async collectLicorReadings(deviceId: string): Promise<void> {
  const device = await this.getDevice(deviceId);
  
  if (device.deviceType !== 'LICOR_*') return;
  
  // Get latest data from Licor API
  const readings = await this.licorApiClient.getLatestReadings(
    device.licorConfig.apiDeviceId
  );
  
  // Store readings in database
  for (const reading of readings) {
    await this.storeLicorReading(deviceId, reading);
  }
  
  // Submit to Guardian if enabled
  if (this.isGuardianEnabled()) {
    for (const reading of readings) {
      await this.guardianSubmission.submitReading(reading);
    }
  }
}

// Scheduled job for polling
@Cron(CronExpression.EVERY_5_MINUTES)
async pollLicorDevices(): Promise<void> {
  const licorDevices = await this.getLicorDevices();
  
  for (const device of licorDevices) {
    await this.collectLicorReadings(device.deviceId);
  }
}
```

### 3.2 Guardian Processing Queue
**New file**: `backend/src/modules/guardian/guardian.consumer.ts`

Bull queue for async Guardian submissions:
```typescript
@Processor('guardian-submissions')
export class GuardianConsumer {
  @Process('submit-reading')
  async processReadingSubmission(job: Job<SubmissionJobData>) {
    const { readingId, deviceId } = job.data;
    
    try {
      await this.guardianSubmission.submitReading(reading);
      return { status: 'success' };
    } catch (error) {
      // Retry logic
      throw error;
    }
  }
  
  @Process('batch-mrv')
  async processMRVBatch(job: Job<MRVBatchJobData>) {
    // Batch MRV report submission
  }
}
```

---

## Phase 4: API Endpoints

### 4.1 Licor Endpoints
**Update**: `backend/src/modules/sensors/sensors.controller.ts`

```typescript
@Post('/licor/poll/:deviceId')
async pollLicorDevice(@Param('deviceId') deviceId: string) {
  return await this.dataCollection.collectLicorReadings(deviceId);
}

@Get('/licor/readings/:deviceId')
async getLicorReadings(
  @Param('deviceId') deviceId: string,
  @Query('type') type: string,  // co2_flux, ch4_flux, etc
  @Query('start') start: string,
  @Query('end') end: string
) {
  return await this.dataCollection.getLicorReadings(deviceId, type, start, end);
}

@Get('/licor/summary/:deviceId')
async getLicorSummary(@Param('deviceId') deviceId: string) {
  return await this.dataTransformer.aggregateReadingsForMRV(deviceId, ...);
}
```

### 4.2 Guardian Endpoints
**New file**: `backend/src/modules/guardian/guardian.controller.ts`

```typescript
@Controller('guardian')
export class GuardianController {
  @Post('/submit-reading/:readingId')
  async submitReading(@Param('readingId') readingId: string) {
    return await this.guardianSubmission.submitReading(readingId);
  }
  
  @Post('/mrv-batch')
  async createMRVBatch(@Body() dto: CreateMRVBatchDto) {
    return await this.guardianSubmission.submitMRVBatch(...);
  }
  
  @Get('/submissions/:deviceId')
  async getSubmissions(@Param('deviceId') deviceId: string) {
    return await this.guardianSubmission.getDeviceSubmissions(deviceId);
  }
  
  @Get('/vcs/:deviceDid')
  async getVerifiableCredentials(@Param('deviceDid') deviceDid: string) {
    return await this.guardianApi.getVCsByDevice(deviceDid);
  }
  
  @Get('/carbon-balance/:deviceId')
  async getCarbonBalance(
    @Param('deviceId') deviceId: string,
    @Query('start') start: string,
    @Query('end') end: string
  ) {
    const readings = await this.getLicorReadings(deviceId, start, end);
    return this.dataTransformer.calculateCarbonBalance(readings);
  }
}
```

---

## Phase 5: Environment Configuration

### Backend Configuration
**File**: `backend/.smart_app.env.example`

```env
# Licor API Configuration
LICOR_API_URL=https://api.licor.com/v1
LICOR_API_KEY=your_licor_api_key
LICOR_POLLING_INTERVAL=300000  # 5 minutes in ms
LICOR_WEBHOOK_ENABLED=false

# Guardian Configuration
GUARDIAN_API_URL=https://your-guardian-instance.hedera.com/api/v1
GUARDIAN_POLICY_ID=your-policy-id
GUARDIAN_MRV_BLOCK_TAG=mrv_source
GUARDIAN_USERNAME=device_gateway_user
GUARDIAN_PASSWORD=secure_password
GUARDIAN_ENABLED=true

# DID Configuration
DID_METHOD=hedera
DID_NETWORK=testnet  # or mainnet
DID_AUTO_GENERATE=true

# Processing
GUARDIAN_BATCH_SIZE=100
GUARDIAN_RETRY_ATTEMPTS=3
GUARDIAN_RETRY_DELAY=5000
```

---

## Phase 6: Frontend Updates

### 6.1 Licor Dashboard Component
**New component**: `frontend/src/app/components/licor-dashboard/licor-dashboard.component.ts`

Features:
- Real-time Licor measurement display
- CO2/CH4 flux charts
- Evapotranspiration rates
- Net carbon sequestration indicator
- Guardian submission status

### 6.2 Guardian Status Widget
**New component**: `frontend/src/app/components/guardian-status/guardian-status.component.ts`

Features:
- Pending submissions count
- Latest VCs issued
- IPFS links to credentials
- Hedera transaction IDs
- Carbon credit balance

---

## Success Criteria

✅ Licor API successfully polled for device data
✅ Readings stored in MongoDB with proper schemas
✅ Guardian schema uploaded and policy configured
✅ Device DIDs generated and managed
✅ Readings successfully submitted to Guardian external data block
✅ Guardian issues VCs and pins to IPFS
✅ VCs anchored on Hedera with transaction IDs
✅ Carbon balance calculations accurate
✅ Frontend displays Guardian submission status
✅ MRV batch processing works for reporting periods

---

## Implementation Priority

1. **Foundation** (Phase 1): Licor API client + data schemas
2. **Guardian Core** (Phase 2.1-2.4): API client, DID manager, transformers
3. **Integration** (Phase 2.5-3.2): Submission service + processing pipeline
4. **APIs** (Phase 4): REST endpoints for both systems
5. **Configuration** (Phase 5): Environment setup
6. **Frontend** (Phase 6): User-facing dashboards

---

## Next Steps After Plan Approval

1. Set up Guardian policy with externalDataBlock and schema
2. Obtain Licor API credentials and test endpoints
3. Create DID registry for existing devices
4. Implement Phase 1 (Licor API integration)
5. Implement Phase 2 (Guardian foundation)
6. Test end-to-end: Licor → Backend → Guardian → VC → IPFS → Hedera

