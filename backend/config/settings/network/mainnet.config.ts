import { ISmartNetwork } from '@hsuite/smart-network-types';

export const customMainnetConfig: ISmartNetwork.INetwork.IConfig.ISettings = ({
  nodes: [
    {
      membership: {
        operator: {
          accountId: "MAINNET_NODE_ACCOUNT_ID",
          publicKey: "MAINNET_NODE_PUBLIC_KEY",
        url: "MAINNET_NODE_URL",
          nft: null
        },
        walletId: null,
        status: null,
        details: null
      },
      type: "MAINNET_NODE_TYPE",
      dkgId: "DKG_ID",
      clusters: []
    },
  ],
  utilities: [
    {
      name: 'hsuite',
      id: '0.0.2203022',
      treasury: '0.0.2193470',
      decimals: '4'
    },
    {
      name: 'veHsuite',
      id: '0.0.2203405',
      treasury: '0.0.2203617',
      decimals: '4'
    }
  ],
  fees: {
    percentage: {
      hbar: 0.03,
      hsuite: 0.03
    },
    fixed: {
      hbar: 1,
      hsuite: 250
    },
    wallet: '0.0.2205410'
  }
});