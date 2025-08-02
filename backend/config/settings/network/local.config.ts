import { ISmartNetwork } from '@hsuite/smart-network-types';

export const customLocalConfig: ISmartNetwork.INetwork.IConfig.ISettings = ({
  nodes: [
    {
      membership: {
        operator: {
          accountId: "0.0.2197445",
          publicKey: "302a300506032b6570032100dd5660e4f85c15898fc96f531b0041f2da3817f4b3a975dbde98510dc7a6943b",
          url: "http://jupiter-smart_node-1:3001",
          nft: null
        },
        walletId: null,
        status: null,
        details: null
      },
      type: "core",
      dkgId: "jupiter-dkg-1",
      clusters: []
    },
    {
      membership: {
        operator: {
          accountId: "0.0.2197767",
          publicKey: "302a300506032b6570032100656a759d8563cb2218fcedbbe8a148ec5f4806d73c4dfc74df1da4bda57b55fe",
          url: "http://mars-smart_node-1:3002",
          nft: null
        },
        walletId: null,
        status: null,
        details: null
      },
      type: "core",
      dkgId: "jupiter-dkg-2",
      clusters: []
    },
    {
      membership: {
        operator: {
          accountId: "0.0.2198241",
          publicKey: "302a300506032b65700321008dbe2c7fa5e740baaf51810a189c88af48c3723ddb8465894050fcb6e5382fab",
          url: "http://mercury-smart_node-1:3003",
          nft: null
        },
        walletId: null,
        status: null,
        details: null
      },
      type: "core",
      dkgId: "jupiter-dkg-3",
      clusters: []
    },
    {
      membership: {
        operator: {
          accountId: "0.0.2198363",
          publicKey: "302a300506032b657003210064a2d2c7d17f7fa6046ab8506a8e83da478f357385c627fd59328786e377e346",
          url: "http://saturn-smart_node-1:3004",
          nft: null
        },
        walletId: null,
        status: null,
        details: null
      },
      type: "core",
      dkgId: "jupiter-dkg-4",
      clusters: []
    }
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
