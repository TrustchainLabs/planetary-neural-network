export const environment = {
  production: true,
  isDebugEnabled: false,
  smartAppUrl: 'https://smartdevice2.ecosphereprime.com',
  ledger: 'mainnet',
  
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
    network: 'mainnet',
    supportedNetworks: ['testnet', 'mainnet'],
    defaultNetwork: 'mainnet'
  }
};
