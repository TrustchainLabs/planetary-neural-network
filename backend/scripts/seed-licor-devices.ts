import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { SmartAppModule } from '../src/smart-app.module';
import { Device, DeviceType } from '../src/modules/devices/entities/device.entity';

async function seedLicorDevices() {
  const app = await NestFactory.createApplicationContext(SmartAppModule.register());
  const deviceModel = app.get<Model<Device>>(getModelToken(Device.name));

  console.log('🌱 Seeding Licor devices...');

  const mockDevices = [
    {
      deviceId: 'licor_penang_01',
      name: 'Penang Eddy Covariance Station',
      owner: 'licor',
      deviceType: DeviceType.LICOR_EDDY_COVARIANCE,
      totalShares: 100,
      soldShares: 0,
      availableShares: 100,
      pricePerShare: 15,
      hexId: 'hex_penang_001',
      locationType: 'Point',
      coordinates: [100.3288, 5.4141], // [longitude, latitude] Penang, Malaysia
      status: 'active',
      licorConfig: {
        apiDeviceId: 'LI7500DS-001',
        capabilities: ['co2_flux', 'ch4_flux', 'evapotranspiration', 'heat_flux'],
        pollingInterval: 300000,
        lastSyncAt: new Date()
      },
      metadata: {
        description: 'Professional CO2/H2O eddy covariance system monitoring tropical forest carbon exchange. This station provides real-time measurements of ecosystem-atmosphere gas exchange.',
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
      deviceType: DeviceType.LICOR_SOIL_FLUX,
      totalShares: 100,
      soldShares: 35,
      availableShares: 65,
      pricePerShare: 12,
      hexId: 'hex_kl_002',
      locationType: 'Point',
      coordinates: [101.6869, 3.1390], // [longitude, latitude] Kuala Lumpur
      status: 'active',
      licorConfig: {
        apiDeviceId: 'LI8100A-001',
        capabilities: ['soil_respiration', 'co2_flux'],
        pollingInterval: 600000,
        lastSyncAt: new Date()
      },
      metadata: {
        description: 'Automated soil CO2 flux measurement system for urban forest monitoring. Tracks soil respiration rates and carbon cycling.',
        instrumentModel: 'LI-COR LI-8100A',
        installationDate: new Date('2023-11-20'),
        calibrationDate: new Date('2024-09-15')
      }
    },
    {
      deviceId: 'licor_singapore_01',
      name: 'Singapore Smart Flux System',
      owner: 'licor',
      deviceType: DeviceType.LICOR_SMART_FLUX,
      totalShares: 100,
      soldShares: 85,
      availableShares: 15,
      pricePerShare: 20,
      hexId: 'hex_singapore_003',
      locationType: 'Point',
      coordinates: [103.8198, 1.3521], // [longitude, latitude] Singapore
      status: 'active',
      licorConfig: {
        apiDeviceId: 'SMARTFLUX-001',
        capabilities: ['co2_flux', 'ch4_flux', 'evapotranspiration', 'heat_flux', 'energy_balance'],
        pollingInterval: 180000,
        lastSyncAt: new Date()
      },
      metadata: {
        description: 'Complete eddy covariance system with integrated data processing. Premium station with full energy balance and greenhouse gas measurements.',
        instrumentModel: 'LI-COR SmartFlux 3',
        installationDate: new Date('2024-03-01'),
        calibrationDate: new Date('2024-10-15')
      }
    },
    {
      deviceId: 'licor_johor_01',
      name: 'Johor Trace Gas Analyzer',
      owner: 'licor',
      deviceType: DeviceType.LICOR_TRACE_GAS,
      totalShares: 100,
      soldShares: 50,
      availableShares: 50,
      pricePerShare: 18,
      hexId: 'hex_johor_004',
      locationType: 'Point',
      coordinates: [103.7578, 1.4854], // [longitude, latitude] Johor, Malaysia
      status: 'active',
      licorConfig: {
        apiDeviceId: 'LI7810-001',
        capabilities: ['ch4_flux', 'co2_flux'],
        pollingInterval: 240000,
        lastSyncAt: new Date()
      },
      metadata: {
        description: 'High-precision CH4/CO2 trace gas analyzer for greenhouse gas monitoring in agricultural lands. Provides accurate methane emission measurements.',
        instrumentModel: 'LI-COR LI-7810',
        installationDate: new Date('2024-02-10'),
        calibrationDate: new Date('2024-10-20')
      }
    },
    {
      deviceId: 'licor_melaka_01',
      name: 'Melaka Forest Carbon Station',
      owner: 'licor',
      deviceType: DeviceType.LICOR_EDDY_COVARIANCE,
      totalShares: 100,
      soldShares: 10,
      availableShares: 90,
      pricePerShare: 14,
      hexId: 'hex_melaka_005',
      locationType: 'Point',
      coordinates: [102.2501, 2.1896], // [longitude, latitude] Melaka, Malaysia
      status: 'active',
      licorConfig: {
        apiDeviceId: 'LI7500DS-002',
        capabilities: ['co2_flux', 'evapotranspiration', 'heat_flux'],
        pollingInterval: 300000,
        lastSyncAt: new Date()
      },
      metadata: {
        description: 'Forest ecosystem monitoring station measuring carbon sequestration in managed tropical forest. Contributes to regional carbon budget assessment.',
        instrumentModel: 'LI-COR LI-7500DS',
        installationDate: new Date('2024-04-05'),
        calibrationDate: new Date('2024-10-25')
      }
    }
  ];

  try {
    // Check if devices already exist
    for (const deviceData of mockDevices) {
      const existing = await deviceModel.findOne({ deviceId: deviceData.deviceId });
      
      if (existing) {
        console.log(`⏭️  Device ${deviceData.deviceId} already exists, skipping...`);
        continue;
      }

      const device = await deviceModel.create(deviceData);
      console.log(`✅ Created device: ${device.name} (${device.deviceId})`);
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Total devices created: ${mockDevices.length}`);
    console.log(`   Total shares available: ${mockDevices.reduce((sum, d) => sum + d.availableShares, 0)}`);
    console.log(`\n🔗 Test API:`);
    console.log(`   GET http://localhost:8888/devices/partnerships/available`);
    
  } catch (error) {
    console.error('❌ Error seeding devices:', error);
  } finally {
    await app.close();
  }
}

// Run the seeder
seedLicorDevices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

