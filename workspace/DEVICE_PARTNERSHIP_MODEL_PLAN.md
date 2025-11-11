# Device Partnership Model - Implementation Plan

## Business Model Pivot

### OLD Model (Deprecated)
- Users purchase physical devices (Raspberry Pi + sensors)
- Users own and operate devices
- Devices placed in owned Geo Medallion hexagons
- Single owner per device
- Rewards go to device owner

### NEW Model (Active)
- **Licor owns all devices** - Professional environmental monitoring equipment
- **Users buy participation shares** - Partnership in device revenue/credits
- **Multiple partners per device** - Fractional ownership model
- **API-based data access** - No physical device management
- **Proportional rewards** - Credits split among partners based on share percentage

## Architecture Changes Required

### Entity Model Transformation

#### Before: Device Ownership
```
Device (1) ---- owns ----> (1) User
GeoMedallion (1) ---- owns ----> (1) User
Device (1) ---- placed_in ----> (1) GeoMedallion
```

#### After: Device Partnership
```
Device (1) ---- owned_by ----> (1) Licor
Device (1) ---- has_many ----> (N) Partnerships
Partnership (N) ---- belongs_to ----> (1) User
Partnership ---- has_share_percentage ----> Number
GeoMedallion (1) ---- contains ----> (1) Device
Partnerships ---- earn_credits ----> Proportional to share %
```

---

## Phase 1: Backend Data Model Redesign

### 1.1 Update Device Entity
**File**: `backend/src/modules/devices/entities/device.entity.ts`

**Changes**:
```typescript
@Schema({ collection: 'devices', timestamps: true })
export class Device extends Document {
  @Prop({ required: true, unique: true }) deviceId: string;
  @Prop({ required: true }) name: string;
  
  // Licor ownership model
  @Prop({ required: true, default: 'licor' }) owner: string;  // Always 'licor'
  @Prop({ required: true, enum: DeviceType }) deviceType: string; // LICOR_EDDY_COVARIANCE, etc
  @Prop({ required: true }) licorApiId: string;  // Licor's device identifier
  
  // Partnership configuration
  @Prop({ required: true, default: 100 }) totalShares: number;  // Total shares available
  @Prop({ required: true, default: 0 }) soldShares: number;     // Shares already sold
  @Prop({ required: true, default: 0 }) availableShares: number; // Remaining shares
  @Prop({ required: true }) pricePerShare: number;               // HBAR per share
  
  // Location & Status
  @Prop({ required: true }) hexId: string;  // GeoMedallion location
  @Prop({ type: Object, required: true }) location: {
    coordinates: [number, number];  // [longitude, latitude]
  };
  @Prop({ required: true, default: 'active' }) status: string;  // active/inactive/maintenance
  
  // Licor-specific configuration
  @Prop({ type: Object, required: true }) licorConfig: {
    apiDeviceId: string;
    capabilities: string[];  // ['co2_flux', 'ch4_flux', 'evapotranspiration', etc]
    pollingInterval: number;
    lastSyncAt?: Date;
  };
  
  // Metadata
  @Prop({ type: Object }) metadata?: {
    description: string;
    instrumentModel: string;
    installationDate: Date;
    calibrationDate: Date;
    imageUrl?: string;
  };
  
  @Prop() createdAt?: Date;
  @Prop() updatedAt?: Date;
}
```

### 1.2 Create Device Partnership Entity
**New file**: `backend/src/modules/devices/entities/device-partnership.entity.ts`

```typescript
@Schema({ collection: 'device_partnerships', timestamps: true })
export class DevicePartnership extends Document {
  @Prop({ required: true, unique: true }) partnershipId: string;
  
  // Relationship
  @Prop({ required: true, index: true }) deviceId: string;
  @Prop({ required: true, index: true }) userWallet: string;  // User's Hedera wallet address
  
  // Share ownership
  @Prop({ required: true, min: 0, max: 100 }) sharePercentage: number;  // % of device ownership
  @Prop({ required: true, min: 1 }) numberOfShares: number;              // Actual shares owned
  
  // Purchase details
  @Prop({ required: true }) purchasePrice: number;           // Total HBAR paid
  @Prop({ required: true }) purchaseDate: Date;
  @Prop({ required: true }) purchaseTransactionId: string;  // Hedera transaction hash
  
  // NFT representation (optional - can mint partnership as NFT)
  @Prop() partnershipNftId?: string;
  @Prop() nftSerialNumber?: number;
  
  // Status
  @Prop({ required: true, default: 'active' }) status: string;  // active/transferred/revoked
  
  // Rewards tracking
  @Prop({ type: Object, default: {} }) rewardsEarned: {
    totalCredits: number;
    lastPayoutDate?: Date;
    lastPayoutAmount?: number;
  };
  
  @Prop() createdAt?: Date;
  @Prop() updatedAt?: Date;
}

// Compound index for efficient queries
DevicePartnershipSchema.index({ deviceId: 1, userWallet: 1 }, { unique: true });
```

### 1.3 Create Device Partnership DTOs
**New files**: `backend/src/modules/devices/dto/`

**create-device-partnership.dto.ts**:
```typescript
export class CreateDevicePartnershipDto {
  @IsString() deviceId: string;
  @IsString() userWallet: string;
  @IsNumber() @Min(1) numberOfShares: number;
  @IsString() paymentTransactionId: string;  // Hedera payment proof
}
```

**read-device-partnerships.dto.ts**:
```typescript
export class ReadDevicePartnershipsDto {
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsString() userWallet?: string;
  @IsOptional() @IsEnum(['active', 'transferred', 'revoked']) status?: string;
  @IsOptional() @IsNumber() limit?: number;
  @IsOptional() @IsNumber() offset?: number;
}
```

**purchase-device-share.dto.ts**:
```typescript
export class PurchaseDeviceShareDto {
  @IsString() deviceId: string;
  @IsNumber() @Min(1) numberOfShares: number;
  @IsString() buyerWallet: string;
  @IsString() paymentTransactionId: string;
}
```

---

## Phase 2: Backend Services & Business Logic

### 2.1 Device Partnership Service
**New file**: `backend/src/modules/devices/device-partnership.service.ts`

```typescript
@Injectable()
export class DevicePartnershipService {
  constructor(
    @InjectModel('Device') private deviceModel: Model<Device>,
    @InjectModel('DevicePartnership') private partnershipModel: Model<DevicePartnership>,
    private geoMedallionsService: GeoMedallionsService
  ) {}
  
  // Get available devices for partnership
  async getAvailableDevices(filters?: any): Promise<Device[]> {
    return await this.deviceModel.find({
      status: 'active',
      availableShares: { $gt: 0 },
      ...filters
    }).exec();
  }
  
  // Purchase device shares
  async purchaseShares(dto: PurchaseDeviceShareDto): Promise<DevicePartnership> {
    const device = await this.deviceModel.findOne({ deviceId: dto.deviceId });
    
    if (!device) throw new NotFoundException('Device not found');
    if (device.availableShares < dto.numberOfShares) {
      throw new BadRequestException('Not enough shares available');
    }
    
    // Calculate share percentage
    const sharePercentage = (dto.numberOfShares / device.totalShares) * 100;
    const purchasePrice = dto.numberOfShares * device.pricePerShare;
    
    // Verify payment transaction on Hedera (TODO: implement)
    // await this.verifyHederaTransaction(dto.paymentTransactionId, purchasePrice);
    
    // Create partnership
    const partnership = await this.partnershipModel.create({
      partnershipId: `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId: dto.deviceId,
      userWallet: dto.buyerWallet,
      sharePercentage,
      numberOfShares: dto.numberOfShares,
      purchasePrice,
      purchaseDate: new Date(),
      purchaseTransactionId: dto.paymentTransactionId,
      status: 'active',
      rewardsEarned: { totalCredits: 0 }
    });
    
    // Update device shares
    await this.deviceModel.updateOne(
      { deviceId: dto.deviceId },
      {
        $inc: { 
          soldShares: dto.numberOfShares,
          availableShares: -dto.numberOfShares
        }
      }
    );
    
    return partnership;
  }
  
  // Get user's partnerships
  async getUserPartnerships(userWallet: string): Promise<DevicePartnership[]> {
    return await this.partnershipModel.find({
      userWallet,
      status: 'active'
    }).exec();
  }
  
  // Get all partners of a device
  async getDevicePartners(deviceId: string): Promise<DevicePartnership[]> {
    return await this.partnershipModel.find({
      deviceId,
      status: 'active'
    }).exec();
  }
  
  // Calculate reward distribution
  async distributeRewards(deviceId: string, totalCredits: number): Promise<void> {
    const partners = await this.getDevicePartners(deviceId);
    
    for (const partner of partners) {
      const partnerCredits = (partner.sharePercentage / 100) * totalCredits;
      
      // Update partnership rewards
      await this.partnershipModel.updateOne(
        { partnershipId: partner.partnershipId },
        {
          $inc: { 'rewardsEarned.totalCredits': partnerCredits },
          $set: { 
            'rewardsEarned.lastPayoutDate': new Date(),
            'rewardsEarned.lastPayoutAmount': partnerCredits
          }
        }
      );
      
      // TODO: Trigger actual credit transfer to partner's wallet
      // await this.transferCreditsToWallet(partner.userWallet, partnerCredits);
    }
  }
}
```

### 2.2 Update Devices Service
**File**: `backend/src/modules/devices/devices.service.ts`

**Remove**:
- Old device creation for user-owned devices
- Device ownership transfer logic

**Add**:
- Integration with `DevicePartnershipService`
- Methods to query available devices
- Device filtering by location/type/availability

### 2.3 Licor Device Sync Service
**New file**: `backend/src/modules/devices/licor-device-sync.service.ts`

```typescript
@Injectable()
export class LicorDeviceSyncService {
  constructor(
    @InjectModel('Device') private deviceModel: Model<Device>,
    private licorApiClient: LicorApiClientService
  ) {}
  
  // Sync Licor devices from API
  @Cron(CronExpression.EVERY_HOUR)
  async syncLicorDevices(): Promise<void> {
    const licorDevices = await this.licorApiClient.getDeviceList();
    
    for (const licorDevice of licorDevices) {
      // Check if device exists in our DB
      const existingDevice = await this.deviceModel.findOne({
        licorApiId: licorDevice.id
      });
      
      if (!existingDevice) {
        // Create new device entry
        await this.createDeviceFromLicor(licorDevice);
      } else {
        // Update device status/metadata
        await this.updateDeviceFromLicor(existingDevice, licorDevice);
      }
    }
  }
  
  private async createDeviceFromLicor(licorDevice: any): Promise<Device> {
    // Create device with partnership model
    return await this.deviceModel.create({
      deviceId: `licor_${licorDevice.id}`,
      name: licorDevice.name || `Licor Device ${licorDevice.id}`,
      owner: 'licor',
      deviceType: this.mapLicorType(licorDevice.type),
      licorApiId: licorDevice.id,
      totalShares: 100,  // Default: 100 shares per device
      soldShares: 0,
      availableShares: 100,
      pricePerShare: 10,  // Default: 10 HBAR per share (configurable)
      hexId: this.findNearestHexagon(licorDevice.location),
      location: {
        coordinates: [licorDevice.location.lon, licorDevice.location.lat]
      },
      status: licorDevice.status || 'active',
      licorConfig: {
        apiDeviceId: licorDevice.id,
        capabilities: licorDevice.capabilities || [],
        pollingInterval: 300000, // 5 minutes
        lastSyncAt: new Date()
      },
      metadata: {
        description: licorDevice.description,
        instrumentModel: licorDevice.model,
        installationDate: licorDevice.installedAt,
        calibrationDate: licorDevice.lastCalibration,
        imageUrl: licorDevice.imageUrl
      }
    });
  }
}
```

---

## Phase 3: API Endpoints

### 3.1 Device Partnership Controller
**New file**: `backend/src/modules/devices/device-partnership.controller.ts`

```typescript
@Controller('devices/partnerships')
export class DevicePartnershipController {
  constructor(private partnershipService: DevicePartnershipService) {}
  
  @Get('/available')
  async getAvailableDevices(
    @Query('location') location?: string,
    @Query('type') type?: string,
    @Query('minShares') minShares?: number
  ) {
    return await this.partnershipService.getAvailableDevices({
      ...(type && { deviceType: type }),
      ...(minShares && { availableShares: { $gte: minShares } })
    });
  }
  
  @Post('/purchase')
  async purchaseShares(@Body() dto: PurchaseDeviceShareDto) {
    return await this.partnershipService.purchaseShares(dto);
  }
  
  @Get('/user/:wallet')
  async getUserPartnerships(@Param('wallet') wallet: string) {
    return await this.partnershipService.getUserPartnerships(wallet);
  }
  
  @Get('/device/:deviceId/partners')
  async getDevicePartners(@Param('deviceId') deviceId: string) {
    return await this.partnershipService.getDevicePartners(deviceId);
  }
  
  @Get('/device/:deviceId/details')
  async getDeviceDetails(@Param('deviceId') deviceId: string) {
    // Returns device info + partnership details + available shares
  }
}
```

---

## Phase 4: Frontend UI Changes

### 4.1 Replace "Add Device" with "Available Devices"
**Update**: `frontend/src/app/shared/enums/index.ts`

```typescript
export enum TabName {
  DASHBOARD = 'dashboard',
  GEO_MEDALLION = 'geo-medallion',
  GEO_MEDALLION_CREATION = 'geo-medallion-creation',
  AVAILABLE_DEVICES = 'available-devices',  // NEW: replaces ADD_DEVICE
  MY_PARTNERSHIPS = 'my-partnerships',       // NEW: user's device partnerships
  PURCHASE_MEDALLION = 'purchase-medallion'
}
```

### 4.2 Available Devices List Component
**New component**: `frontend/src/app/components/available-devices/available-devices.component.ts`

Features:
- Display Licor devices on map with "Available" badge
- Show device details:
  - Type (Eddy Covariance, Soil Flux, etc)
  - Location (hexagon ID)
  - Available shares (e.g., "45/100 shares available")
  - Price per share (HBAR)
  - Current partners count
  - Real-time data preview
- "Buy Participation" button
- Filters: device type, location, price range, available shares

### 4.3 Device Partnership Purchase Modal
**New component**: `frontend/src/app/components/purchase-device-share/purchase-device-share-modal.component.ts`

Features:
- Device summary card
- Share calculator:
  - Number of shares slider/input (1-100)
  - Real-time price calculation
  - Estimated monthly credits based on device history
  - Share percentage display
- Payment flow:
  - Connect wallet (if not connected)
  - Approve transaction
  - Confirm purchase
  - Show transaction status
- Success screen with partnership NFT preview

### 4.4 My Partnerships Component
**New component**: `frontend/src/app/components/my-partnerships/my-partnerships.component.ts`

Features:
- List of user's device partnerships
- For each partnership:
  - Device name and type
  - Share percentage owned
  - Total investment (HBAR)
  - Credits earned to date
  - Last payout date/amount
  - Current device status
- Aggregated stats:
  - Total partnerships
  - Total shares owned across all devices
  - Total credits earned
  - Portfolio value

### 4.5 Update Map Component
**File**: `frontend/src/app/components/map/map.component.ts`

**Changes**:
- Show Licor devices as distinct markers (different from user devices)
- Color-code by availability:
  - Green: 50%+ shares available
  - Yellow: 10-50% shares available
  - Red: <10% shares available
  - Gray: Fully subscribed
- Click device marker → show device details panel
- "Buy Participation" CTA directly from map

### 4.6 Update Left Panel Content
**File**: `frontend/src/app/components/left-panel-content/left-panel-content.component.ts`

Replace device registration flow with:
- Available devices browser
- Partnership purchase flow
- My partnerships dashboard

---

## Phase 5: Smart Contracts & Payment Flow

### 5.1 Partnership Payment Verification
**New service**: `backend/src/modules/devices/hedera-payment-verifier.service.ts`

```typescript
@Injectable()
export class HederaPaymentVerifierService {
  // Verify HBAR payment transaction
  async verifyPayment(
    transactionId: string,
    expectedAmount: number,
    recipientAccount: string
  ): Promise<boolean> {
    // Query Hedera mirror node
    // Verify transaction details match expected payment
  }
}
```

### 5.2 Partnership NFT Minting (Optional)
**Integration**: Use existing NFT minting flow from Geo Medallions

Each partnership can be minted as an NFT representing:
- Device ID
- Share percentage
- Purchase date
- Partnership terms

---

## Phase 6: Guardian Integration Updates

### 6.1 Reward Distribution via Guardian
**Update**: `backend/src/modules/guardian/guardian-submission.service.ts`

After Guardian issues VCs for device data:
1. Calculate total carbon credits earned by device
2. Query all active partnerships for that device
3. Distribute credits proportionally to partners
4. Record distribution in blockchain
5. Update partnership entity with earned rewards

### 6.2 Partnership Verification Credentials
**New schema**: `backend/src/modules/guardian/schemas/device-partnership.guardian-schema.json`

Guardian schema for partnership verification:
- Partnership ID
- Device DID
- Partner wallet address
- Share percentage
- Active status
- Credential issuer: Ecosphere

---

## Phase 7: Admin Panel Updates

### 7.1 Licor Device Management
**New admin features**:
- Import devices from Licor API
- Set share pricing per device
- Adjust total shares available
- Monitor partnership sales
- Pause/resume device availability
- View device revenue

### 7.2 Partnership Management
**Admin capabilities**:
- View all partnerships
- Monitor distribution status
- Handle disputes/transfers
- Generate partnership reports
- Track credit distribution

---

## Migration Strategy

### Step 1: Database Migration
1. Create new tables (DevicePartnership)
2. Migrate existing devices to Licor ownership model
3. Set default share structure for existing devices
4. Preserve historical data

### Step 2: Frontend Gradual Rollout
1. Keep old "Add Device" flow temporarily (with deprecation notice)
2. Launch "Available Devices" as new primary flow
3. Allow users to transition existing devices to partnership model (optional)
4. After 30 days, remove old flow

### Step 3: User Communication
- Email existing users about new partnership model
- Highlight benefits: lower barrier to entry, professional devices, passive income
- Offer migration incentive (bonus credits for early adopters)

---

## Success Metrics

### Business Metrics
- Number of partnerships created per day/week
- Average shares purchased per user
- Total partnership revenue (HBAR)
- Device utilization rate (% of shares sold)
- User retention (active partners vs churned)

### Technical Metrics
- Licor API sync reliability (uptime %)
- Payment verification success rate
- Credit distribution accuracy
- Guardian VC issuance rate
- Partnership NFT mint success rate

---

## Roadmap

### Phase 1 (Week 1-2): Backend Foundation
- Create new entities and DTOs
- Implement DevicePartnershipService
- Build Licor sync service
- API endpoints for partnerships

### Phase 2 (Week 2-3): Frontend UI
- Available Devices component
- Purchase flow and modals
- My Partnerships dashboard
- Update map component

### Phase 3 (Week 3-4): Integration
- Payment verification
- Guardian reward distribution
- Partnership NFT minting
- Admin panel

### Phase 4 (Week 4-5): Testing & Launch
- End-to-end testing
- Security audit
- Beta launch with select users
- Monitor and iterate

---

## Open Questions

1. **Share pricing model**: Fixed price per share, or dynamic based on device performance/demand?
2. **Share transferability**: Can users sell/transfer their partnerships to others?
3. **Minimum purchase**: Require minimum number of shares per purchase?
4. **Partnership duration**: Perpetual or time-limited partnerships?
5. **Revenue sharing**: How is Licor/Ecosphere revenue split from partnership sales?
6. **Device retirement**: What happens to partnerships if a device is decommissioned?
7. **Credit redemption**: Can users cash out credits, or only use within platform?

