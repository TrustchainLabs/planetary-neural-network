# Quick Start Guide - Hackathon Demo

## ✅ What's Done

### Backend (100% Complete)
- ✅ Device Partnership API (7 endpoints)
- ✅ Database models (Device, DevicePartnership)
- ✅ Business logic (purchase, rewards, queries)
- ✅ Wallet authentication
- ✅ Mock data seeder ready

### Frontend (40% Complete)
- ✅ Wallet connection (HashPack, Kabila)
- ✅ Auth flow with persistence
- ✅ Navigation structure
- ⚠️ Partnership components (pending)

---

## 🚀 Getting Started (5 Minutes)

### Step 1: Start Backend
```bash
cd backend
yarn install          # If not already done
yarn seed:licor       # Populate 5 mock Licor devices
yarn start:dev        # Start backend on port 8888
```

**Verify**: Visit http://localhost:8888/devices/partnerships/available
- Should see 5 Licor devices with different availability

### Step 2: Start Frontend
```bash
cd frontend
npm install           # If not already done
npm start             # Start on port 4200
```

**Verify**: Visit http://localhost:4200
- Should see login page

### Step 3: Test Wallet Connection
1. Click "Connect Wallet"
2. Select HashPack (or Kabila)
3. Approve connection
4. Should redirect to dashboard

---

## 🎯 Next Development Steps

### Priority 1: Mock Data (✅ READY TO RUN)
```bash
cd backend
yarn seed:licor
```

**What this does**:
- Creates 5 Licor devices in database
- Different types: Eddy Covariance, Soil Flux, Smart Flux, Trace Gas
- Different locations: Penang, KL, Singapore, Johor, Melaka
- Varying availability: 15% to 90% shares available

### Priority 2: Frontend Service (30 min)
**File**: `frontend/src/app/shared/services/device-partnership.service.ts`

Create Angular service to call backend APIs:
- `getAvailableDevices()`
- `getDeviceDetails(deviceId)`
- `purchaseShares(dto)`
- `getUserPartnerships(wallet)`
- `getUserStats(wallet)`

### Priority 3: Available Devices Component (2 hours)
**File**: `frontend/src/app/components/available-devices/`

Display device cards with:
- Device name and type
- Location (hex)
- Shares available / total
- Price per share
- "Buy Shares" button

### Priority 4: Purchase Modal (2 hours)
**File**: `frontend/src/app/components/purchase-device-share-modal/`

Modal with:
- Device summary
- Share quantity selector
- Price calculator
- Wallet transaction
- Confirmation

### Priority 5: My Partnerships (1.5 hours)
**File**: `frontend/src/app/components/my-partnerships/`

Dashboard showing:
- Portfolio stats (total investment, shares, credits)
- List of user's partnerships
- Individual device cards

### Priority 6: Map Integration (1 hour)
**File**: `frontend/src/app/components/map/map.component.ts`

Update existing map to:
- Show Licor device markers
- Color-code by availability (green/yellow/red)
- Click to open purchase modal

### Priority 7: Navigation (30 min)
Update left navigation:
- Replace "Add Device" → "Available Devices"
- Add "My Partnerships" tab
- Wire up routing

---

## 🧪 Testing the Backend

### Test 1: List Available Devices
```bash
curl http://localhost:8888/devices/partnerships/available
```

**Expected**: Array of 5 devices with shares info

### Test 2: Get Device Details
```bash
curl http://localhost:8888/devices/partnerships/device/licor_penang_01
```

**Expected**: Full device details with licorConfig and metadata

### Test 3: Purchase Shares (Mock)
```bash
curl -X POST http://localhost:8888/devices/partnerships/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "licor_penang_01",
    "numberOfShares": 10,
    "buyerWallet": "0.0.123456",
    "paymentTransactionId": "0.0.123456@1234567890.123456789"
  }'
```

**Expected**: Partnership created, device availableShares reduced

### Test 4: User Partnerships
```bash
curl http://localhost:8888/devices/partnerships/user/0.0.123456
```

**Expected**: Array of partnerships for that wallet

### Test 5: User Stats
```bash
curl http://localhost:8888/devices/partnerships/user/0.0.123456/stats
```

**Expected**: Portfolio summary with totals

---

## 🎬 Demo Flow (Once Complete)

### Act 1: Discovery
1. User logs in with wallet
2. Navigates to "Available Devices"
3. Sees 5 Licor devices on map/list
4. Clicks on "Penang Eddy Covariance Station"

### Act 2: Investment
5. Views device details (location, type, shares)
6. Clicks "Buy Shares"
7. Modal opens with calculator
8. Enters 10 shares → sees 150 HBAR total, 10% ownership
9. Clicks "Purchase"
10. Signs transaction with wallet
11. Success notification

### Act 3: Portfolio
12. Navigates to "My Partnerships"
13. Sees portfolio stats: 1 partnership, 150 HBAR invested
14. Sees device card with 10% ownership
15. (Future) Shows credits earned

---

## 📁 Key Files Reference

### Backend
```
backend/
├── src/modules/devices/
│   ├── entities/
│   │   ├── device.entity.ts                  ✅ Updated with partnership fields
│   │   └── device-partnership.entity.ts       ✅ New partnership tracking
│   ├── dto/
│   │   ├── purchase-device-share.dto.ts      ✅ Purchase API input
│   │   ├── read-device-partnerships.dto.ts   ✅ Query API input
│   │   └── available-devices-query.dto.ts    ✅ Filter/search API input
│   ├── device-partnership.service.ts         ✅ Core business logic
│   ├── device-partnership.controller.ts      ✅ REST API endpoints
│   └── devices.module.ts                     ✅ Updated with new components
└── scripts/
    └── seed-licor-devices.ts                 ✅ Mock data seeder
```

### Frontend (To Build)
```
frontend/src/app/
├── shared/
│   ├── services/
│   │   └── device-partnership.service.ts     ⚠️ TO BUILD
│   └── enums/
│       └── index.ts                          ✅ Updated with new tabs
└── components/
    ├── available-devices/                    ⚠️ TO BUILD
    │   ├── available-devices.component.ts
    │   ├── available-devices.component.html
    │   └── available-devices.component.scss
    ├── purchase-device-share-modal/          ⚠️ TO BUILD
    │   ├── purchase-device-share-modal.component.ts
    │   ├── purchase-device-share-modal.component.html
    │   └── purchase-device-share-modal.component.scss
    ├── my-partnerships/                      ⚠️ TO BUILD
    │   ├── my-partnerships.component.ts
    │   ├── my-partnerships.component.html
    │   └── my-partnerships.component.scss
    └── map/
        └── map.component.ts                  ⚠️ TO UPDATE
```

---

## 🐛 Troubleshooting

### Backend won't start
**Check**:
- MongoDB running? `mongosh` to verify
- Port 8888 available? `lsof -i :8888`
- Dependencies installed? `yarn install`

### Seeder fails
**Check**:
- MongoDB connection in config
- Device schema imported correctly
- SmartAppModule loads properly

### Frontend API calls fail
**Check**:
- Backend is running on :8888
- CORS enabled for localhost:4200
- API base URL correct in environment.ts

### Wallet connection fails
**Check**:
- Hedera testnet selected
- Wallet extension installed (HashPack)
- WalletConnect projectId valid

---

## 🎯 2-Day Sprint Plan

### Day 1: Core Flow (8 hours)
- ✅ Seed data (done)
- ⏰ Frontend service (30 min)
- ⏰ Available Devices component (2 hours)
- ⏰ Purchase Modal (2 hours)
- ⏰ Test purchase flow (1 hour)
- ⏰ My Partnerships basic (1 hour)
- ⏰ Buffer/polish (1.5 hours)

**Goal**: User can browse and purchase shares

### Day 2: Polish & Demo (6 hours)
- ⏰ My Partnerships complete (1 hour)
- ⏰ Map integration (1 hour)
- ⏰ Navigation updates (30 min)
- ⏰ End-to-end testing (1 hour)
- ⏰ Demo script & rehearsal (1.5 hours)
- ⏰ Backup video recording (1 hour)

**Goal**: Complete demo ready to present

---

## 📊 Success Checklist

Before demo day:
- [ ] Backend running without errors
- [ ] 5+ mock devices seeded
- [ ] User can connect wallet
- [ ] Available devices load and display
- [ ] Purchase modal works (at least mock)
- [ ] My Partnerships shows data
- [ ] Map displays device markers
- [ ] Navigation tabs work
- [ ] No console errors
- [ ] Demo script written
- [ ] Rehearsed 3+ times
- [ ] Backup video ready

---

## 🆘 Need Help?

### Common Issues

**Q**: Device entity has validation errors  
**A**: Check `DeviceType` enum is imported correctly

**Q**: Partnership service throws 404  
**A**: Ensure `DevicePartnershipController` is in `devices.module.ts` controllers array

**Q**: Frontend service can't reach backend  
**A**: Verify `environment.ts` has correct `apiUrl` (likely `http://localhost:8888`)

**Q**: Wallet transaction fails  
**A**: For demo, mock the transaction - just create the partnership record without real Hedera TX

---

## 🚀 Ready to Build?

1. Run the seeder: `cd backend && yarn seed:licor`
2. Verify data: Open MongoDB Compass, check `devices` collection
3. Test API: `curl http://localhost:8888/devices/partnerships/available`
4. Start frontend work: Begin with `device-partnership.service.ts`

**Estimated time to MVP**: 8-10 hours of focused work

Let's build! 🎉

