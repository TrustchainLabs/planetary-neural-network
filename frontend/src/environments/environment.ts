// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  isDebugEnabled: false,
  apiUrl: 'http://localhost:8888',
  smartAppUrl: 'https://smartdevice2.ecosphereprime.com',
  ledger: 'testnet',
  
  // Wallet configuration
  walletConnect: {
    projectId: '9c0251b8e667472a75a2147bdce1b614',
    metadata: {
      name: 'Ecosphere',
      description: 'Decentralized Climate Intelligence Network on Hedera',
      url: 'https://ecosphereprime.com',
      icons: ['https://ecosphereprime.com/assets/icon/favicon.png']
    }
  },
  
  // Network configuration
  hedera: {
    network: 'testnet',
    supportedNetworks: ['testnet', 'mainnet'],
    defaultNetwork: 'testnet'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
