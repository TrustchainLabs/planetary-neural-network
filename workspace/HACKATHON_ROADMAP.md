# Hackathon Roadmap - Ecosphere Device Partnership Model

## 🎯 Current Status

### ✅ COMPLETED (100%)
- **Wallet Authentication**: Full WalletConnect integration with Kabila, HashPack
- **Backend Partnership System**: Complete API for device partnerships
- **Data Models**: Device & DevicePartnership entities with MongoDB
- **API Endpoints**: 7 RESTful endpoints ready for frontend

### 🚧 IN PROGRESS (Frontend - 40%)
- **Enums Updated**: AVAILABLE_DEVICES and MY_PARTNERSHIPS tabs defined
- **Services**: Need to create partnership services
- **Components**: 5 major components to build

### ❌ NOT STARTED
- **Licor API Mock**: Test data integration
- **Guardian Integration**: MRV workflow connection
- **Payment Verification**: Hedera transaction validation

---

## 🏃 Sprint Plan for Hackathon

### **CRITICAL PATH** - Minimum Viable Demo (2-3 days)

This is what we MUST have working for a successful demo:

#### Day 1: Core User Flow
**Priority**: 🔴 CRITICAL

**Morning Session (4 hours)**
1. ✅ Create mock Licor devices in database
2. ✅ Create DevicePartnershipService (Angular service)
3. ✅ Build Available Devices List Component (basic)

**Afternoon Session (4 hours)**
4. ✅ Build Purchase Modal (basic calculator)
5. ✅ Integrate wallet payment flow
6. ✅ Test end-to-end purchase

**Success Criteria**: User can browse devices and purchase shares with wallet

---

#### Day 2: User Experience & Display
**Priority**: 🟡 HIGH

**Morning Session (4 hours)**
1. ✅ Build My Partnerships Dashboard
2. ✅ Show user's portfolio and credits earned
3. ✅ Update navigation tabs

**Afternoon Session (4 hours)**
4. ✅ Update map to show Licor devices
5. ✅ Add color-coded availability markers
6. ✅ Polish UI and responsive design

**Success Criteria**: Complete user journey from browse → purchase → view portfolio

---

#### Day 3: Data Flow & Demo Prep
**Priority**: 🟢 MEDIUM

**Morning Session (3 hours)**
1. ✅ Create Licor data mock service
2. ✅ Simulate device readings
3. ✅ Trigger reward distribution

**Afternoon Session (3 hours)**
4. ✅ Test full demo flow
5. ✅ Create demo script
6. ✅ Record video walkthrough

**Success Criteria**: Working demo with realistic data and smooth flow

---

## 📋 Detailed Implementation Checklist

### Phase 1: Mock Data Setup (30 min)
**Status**: Not Started

```typescript
// Create in backend
// File: backend/scripts/seed-licor-devices.ts

const mockLicorDevices = [
  {
    deviceId: 'licor_penang_01',
    name: 'Penang Eddy Covariance Station',
    owner: 'licor',
    deviceType: 'LICOR_EDDY_COVARIANCE',
    totalShares: 100,
    soldShares: 0,
    availableShares: 100,
    pricePerShare: 15, // HBAR
    hexId: 'hex_penang_1',
    location: {
      type: 'Point',
      coordinates: [100.3288, 5.4141] // Penang, Malaysia
    },
    status: 'active',
    licorConfig: {
      apiDeviceId: 'LI7500DS-001',
      capabilities: ['co2_flux', 'ch4_flux', 'evapotranspiration', 'heat_flux'],
      pollingInterval: 300000,
      lastSyncAt: new Date()
    },
    metadata: {
      description: 'Professional CO2/H2O eddy covariance system monitoring tropical forest carbon exchange',
      instrumentModel: 'LI-COR LI-7500DS',
      installationDate: new Date('2024-01-15'),
      calibrationDate: new Date('2024-10-01'),
      imageUrl: 'https://example.com/licor-eddy.jpg'
    }
  },
  {
    deviceId: 'licor_kuala_lumpur_01',
    name: 'KL Soil Flux Station',
    owner: 'licor',
    deviceType: 'LICOR_SOIL_FLUX',
    totalShares: 100,
    soldShares: 35,
    availableShares: 65,
    pricePerShare: 12,
    hexId: 'hex_kl_1',
    location: {
      type: 'Point',
      coordinates: [101.6869, 3.1390] // Kuala Lumpur
    },
    status: 'active',
    licorConfig: {
      apiDeviceId: 'LI8100A-001',
      capabilities: ['soil_respiration', 'co2_flux'],
      pollingInterval: 600000,
      lastSyncAt: new Date()
    },
    metadata: {
      description: 'Automated soil CO2 flux measurement system',
      instrumentModel: 'LI-COR LI-8100A',
      installationDate: new Date('2023-11-20'),
      calibrationDate: new Date('2024-09-15')
    }
  },
  {
    deviceId: 'licor_singapore_01',
    name: 'Singapore Smart Flux System',
    owner: 'licor',
    deviceType: 'LICOR_SMART_FLUX',
    totalShares: 100,
    soldShares: 85,
    availableShares: 15,
    pricePerShare: 20,
    hexId: 'hex_singapore_1',
    location: {
      type: 'Point',
      coordinates: [103.8198, 1.3521] // Singapore
    },
    status: 'active',
    licorConfig: {
      apiDeviceId: 'SMARTFLUX-001',
      capabilities: ['co2_flux', 'ch4_flux', 'evapotranspiration', 'heat_flux', 'energy_balance'],
      pollingInterval: 180000,
      lastSyncAt: new Date()
    },
    metadata: {
      description: 'Complete eddy covariance system with integrated data processing',
      instrumentModel: 'LI-COR SmartFlux 3',
      installationDate: new Date('2024-03-01'),
      calibrationDate: new Date('2024-10-15')
    }
  }
];
```

**Tasks**:
- [ ] Create seed script
- [ ] Run script to populate DB
- [ ] Verify with API: `GET /devices/partnerships/available`

---

### Phase 2: Frontend Services (1 hour)

#### 2.1 Create Partnership Service
**File**: `frontend/src/app/shared/services/device-partnership.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class DevicePartnershipService {
  constructor(private http: HttpClient) {}
  
  getAvailableDevices(filters?: any): Observable<any> {
    return this.http.get(`${API_BASE_URL}/devices/partnerships/available`, { params: filters });
  }
  
  getDeviceDetails(deviceId: string): Observable<any> {
    return this.http.get(`${API_BASE_URL}/devices/partnerships/device/${deviceId}`);
  }
  
  purchaseShares(dto: PurchaseDeviceShareDto): Observable<any> {
    return this.http.post(`${API_BASE_URL}/devices/partnerships/purchase`, dto);
  }
  
  getUserPartnerships(wallet: string): Observable<any> {
    return this.http.get(`${API_BASE_URL}/devices/partnerships/user/${wallet}`);
  }
  
  getUserStats(wallet: string): Observable<any> {
    return this.http.get(`${API_BASE_URL}/devices/partnerships/user/${wallet}/stats`);
  }
}
```

**Tasks**:
- [ ] Create service file
- [ ] Add to app providers
- [ ] Test with mock data

---

### Phase 3: Available Devices Component (2 hours)

**File**: `frontend/src/app/components/available-devices/available-devices.component.ts`

**Features**:
- Device cards grid layout
- Show: name, type, location, shares available, price
- "Buy Shares" button
- Basic filters (device type)
- Loading states

**Template Structure**:
```html
<div class="available-devices-container">
  <div class="filters">
    <!-- Device type filter -->
  </div>
  
  <div class="devices-grid">
    <ion-card *ngFor="let device of devices" class="device-card">
      <ion-card-header>
        <ion-card-title>{{ device.name }}</ion-card-title>
        <ion-card-subtitle>{{ device.deviceType }}</ion-card-subtitle>
      </ion-card-header>
      
      <ion-card-content>
        <div class="device-info">
          <p>Location: {{ device.hexId }}</p>
          <p>Available: {{ device.availableShares }}/{{ device.totalShares }} shares</p>
          <p>Price: {{ device.pricePerShare }} HBAR/share</p>
        </div>
        
        <div class="availability-bar">
          <!-- Progress bar showing % sold -->
        </div>
        
        <ion-button expand="block" (click)="openPurchaseModal(device)">
          Buy Shares
        </ion-button>
      </ion-card-content>
    </ion-card>
  </div>
</div>
```

**Tasks**:
- [ ] Generate component
- [ ] Implement service integration
- [ ] Add styling
- [ ] Test data loading

---

### Phase 4: Purchase Modal (2 hours)

**File**: `frontend/src/app/components/purchase-device-share-modal/purchase-device-share-modal.component.ts`

**Features**:
- Device summary
- Share calculator (input/slider)
- Real-time price calculation
- Wallet check
- Transaction flow

**Key Logic**:
```typescript
calculateTotalPrice(shares: number): number {
  return shares * this.device.pricePerShare;
}

calculateSharePercentage(shares: number): number {
  return (shares / this.device.totalShares) * 100;
}

async purchaseShares() {
  // 1. Check wallet connected
  if (!this.walletAddress) {
    await this.connectWallet();
  }
  
  // 2. Create payment transaction
  const paymentTx = await this.createPaymentTransaction();
  
  // 3. Submit to backend
  const dto = {
    deviceId: this.device.deviceId,
    numberOfShares: this.selectedShares,
    buyerWallet: this.walletAddress,
    paymentTransactionId: paymentTx.transactionId
  };
  
  await this.partnershipService.purchaseShares(dto).toPromise();
  
  // 4. Show success
  this.showSuccess();
}
```

**Tasks**:
- [ ] Generate modal component
- [ ] Implement calculator
- [ ] Integrate wallet service
- [ ] Add payment flow
- [ ] Test with testnet HBAR

---

### Phase 5: My Partnerships Dashboard (1.5 hours)

**File**: `frontend/src/app/components/my-partnerships/my-partnerships.component.ts`

**Features**:
- Portfolio summary (total investment, credits, shares)
- List of partnerships
- Individual partnership cards
- Device status

**Template Structure**:
```html
<div class="partnerships-dashboard">
  <div class="portfolio-summary">
    <ion-card>
      <ion-card-header>
        <ion-card-title>Your Portfolio</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div class="stats-grid">
          <div class="stat">
            <h3>{{ stats.totalPartnerships }}</h3>
            <p>Partnerships</p>
          </div>
          <div class="stat">
            <h3>{{ stats.totalInvestment }} HBAR</h3>
            <p>Total Investment</p>
          </div>
          <div class="stat">
            <h3>{{ stats.totalCreditsEarned }}</h3>
            <p>Credits Earned</p>
          </div>
        </div>
      </ion-card-content>
    </ion-card>
  </div>
  
  <div class="partnerships-list">
    <ion-card *ngFor="let p of partnerships" class="partnership-card">
      <ion-card-header>
        <ion-card-title>{{ p.device.name }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>Your Share: {{ p.partnership.sharePercentage }}%</p>
        <p>Investment: {{ p.partnership.purchasePrice }} HBAR</p>
        <p>Credits Earned: {{ p.partnership.rewardsEarned.totalCredits }}</p>
      </ion-card-content>
    </ion-card>
  </div>
</div>
```

**Tasks**:
- [ ] Generate component
- [ ] Load user partnerships
- [ ] Display stats
- [ ] Add refresh functionality

---

### Phase 6: Map Integration (1 hour)

**File**: `frontend/src/app/components/map/map.component.ts`

**Changes Needed**:
1. Add Licor device markers
2. Color-code by availability:
   - 🟢 Green: 50%+ available
   - 🟡 Yellow: 10-50% available
   - 🔴 Red: <10% available
   - ⚫ Gray: Fully subscribed

3. Click handler → open purchase modal

**Implementation**:
```typescript
// Add to existing map component
loadLicorDevices() {
  this.partnershipService.getAvailableDevices().subscribe(devices => {
    devices.forEach(device => {
      const color = this.getAvailabilityColor(device);
      const marker = this.createDeviceMarker(device, color);
      marker.on('click', () => this.openPurchaseModal(device));
      this.licorMarkers.push(marker);
    });
  });
}

getAvailabilityColor(device: any): string {
  const pctAvailable = (device.availableShares / device.totalShares) * 100;
  if (pctAvailable >= 50) return 'green';
  if (pctAvailable >= 10) return 'yellow';
  if (pctAvailable > 0) return 'red';
  return 'gray';
}
```

**Tasks**:
- [ ] Update marker logic
- [ ] Add Licor device layer
- [ ] Test marker clicks
- [ ] Style popups

---

### Phase 7: Navigation Updates (30 min)

**Files to Update**:
- `frontend/src/app/components/navigation/left-nav/left-nav.component.ts`
- `frontend/src/app/components/left-panel-content/left-panel-content.component.ts`

**Changes**:
1. Replace "Add Device" tab with "Available Devices"
2. Add "My Partnerships" tab
3. Update tab content switching

**Tasks**:
- [ ] Update tab icons/labels
- [ ] Add new tab components
- [ ] Update routing logic

---

## 🧪 Testing Strategy

### Unit Tests (Optional for Hackathon)
- Partnership service methods
- Calculator logic
- Price calculations

### Integration Tests (CRITICAL)
**Test Flow**:
1. Load available devices → Verify 3 devices show
2. Click "Buy Shares" → Modal opens
3. Enter 10 shares → Price calculates correctly
4. Submit purchase → Partnership created
5. Go to My Partnerships → New partnership appears
6. Check device → availableShares decremented

### Demo Script (CRITICAL)
```
1. Start on login page
   → "Connect wallet with HashPack"
   
2. Navigate to Available Devices
   → "Here are professional Licor devices available for partnership"
   → "Notice different availability levels"
   
3. Click Penang device
   → "This eddy covariance system measures CO2 flux"
   → "100 shares available, 15 HBAR per share"
   
4. Buy 10 shares
   → Calculator shows: 150 HBAR total, 10% ownership
   → Sign transaction
   → Success!
   
5. Go to My Partnerships
   → "Here's my portfolio"
   → "10% of Penang device"
   → "Credits will be earned proportionally"
   
6. Show map
   → "Devices located across Malaysia/Singapore"
   → "Color-coded by availability"
```

---

## 🚨 Risk Mitigation

### High Risk Items
1. **Wallet Payment Flow**: Mock for demo if needed
   - **Mitigation**: Use testnet HBAR, pre-fund demo wallet

2. **Licor API Integration**: Not critical for demo
   - **Mitigation**: Use mock data, simulate readings

3. **Guardian Integration**: Can be shown as "coming soon"
   - **Mitigation**: Show architecture diagram

### Medium Risk Items
4. **Map Performance**: Many markers might be slow
   - **Mitigation**: Cluster markers, load on demand

5. **Mobile Responsive**: Might not look great
   - **Mitigation**: Focus on desktop demo

---

## 📊 Success Metrics for Demo

### Must Have ✅
- [ ] User can see available Licor devices
- [ ] User can purchase shares (mock or real)
- [ ] User can view their partnerships
- [ ] Map shows device locations
- [ ] Wallet authentication works

### Nice to Have 🎯
- [ ] Real Hedera payment verification
- [ ] Live Licor data simulation
- [ ] Guardian MRV preview
- [ ] Partnership NFT minting
- [ ] Mobile responsive

### Wow Factor 🌟
- [ ] Real-time device data updates
- [ ] Animated reward distribution
- [ ] Interactive carbon credit calculator
- [ ] Social proof (X other investors)
- [ ] Device comparison tool

---

## 🎬 Presentation Strategy

### Slide 1: Problem
- Current carbon markets lack transparency
- Individual investors can't access professional monitoring
- Licor devices are expensive ($10K+)

### Slide 2: Solution
- Fractional ownership of professional Licor devices
- Proportional carbon credit earnings
- Verified via Hedera Guardian
- Blockchain transparency

### Slide 3: Demo
- [LIVE DEMO OF PLATFORM]
- Show device browse, purchase, portfolio

### Slide 4: Technology
- Hedera for payments & NFTs
- Guardian for MRV verification
- Licor API for professional data
- Geographic tokenization (Geo Medallions)

### Slide 5: Business Model
- Partnership sales revenue
- Transaction fees on credit trading
- Premium features (analytics, alerts)

### Slide 6: Roadmap
- Launch: Partnership model (current)
- Q1: Guardian integration
- Q2: Licor device expansion (50+ devices)
- Q3: Carbon credit marketplace

---

## 📝 Immediate Action Items

### Today (Next 4 hours)
1. ⏰ Create mock Licor devices script
2. ⏰ Run seed script
3. ⏰ Create DevicePartnershipService (Angular)
4. ⏰ Start Available Devices component

### Tomorrow
5. ⏰ Finish Available Devices component
6. ⏰ Build Purchase Modal
7. ⏰ Test purchase flow end-to-end

### Day After
8. ⏰ My Partnerships dashboard
9. ⏰ Map integration
10. ⏰ Final testing & demo prep

---

## 🎯 Definition of Done

**For each component**:
- [ ] Component generated and styled
- [ ] Service integration working
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Works on Chrome/Safari
- [ ] Demo flow tested

**For overall system**:
- [ ] End-to-end flow works
- [ ] No console errors
- [ ] Backend APIs respond <500ms
- [ ] UI is responsive (desktop)
- [ ] Demo script rehearsed 3x
- [ ] Backup plan ready (video)

---

## 🆘 Contingency Plans

### If Backend Breaks
- Use mock services in frontend
- Return hardcoded data
- Show "demo mode" disclaimer

### If Wallet Breaks
- Use pre-connected test wallet
- Skip signature step
- Show modal "Transaction successful"

### If Map Breaks
- Show device list view only
- Use static map image
- Display coordinates as text

---

**Priority**: Focus on the **CRITICAL PATH** first. Get the basic flow working, then add polish.

**Timeline**: 2-3 days for MVP, 1 day for polish and demo prep.

**Remember**: A working demo with 3 features is better than a broken demo with 10 features!

