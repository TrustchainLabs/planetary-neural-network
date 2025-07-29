import { registerAs } from "@nestjs/config";
import { ChainType, LedgerNetwork } from "@hsuite/smart-ledgers";
import { IClient } from "@hsuite/client-types";

/**
 * Client configuration module.
 * @module ClientConfig
 */

/**
 * Registers and exports the client configuration.
 * @function
 * @returns {IClient.IOptions} The client configuration object.
 */
export default registerAs('client', (): IClient.IOptions => ({
    /**
     * Indicates whether the client is enabled.
     * @type {boolean}
     */
    enabled: false,

    /**
     * The base URL for the Smart Registry API.
     * @type {string}
     */
    baseUrl: process.env.BASE_URL,

    /**
     * The ledger configurations for the client.
     * @type {Record<ChainType, ILedgerConfig>}
     * @description Specifies the network environments and authentication 
     * credentials for connecting to multiple distributed ledger networks.
     */
    ledgers: {
        [ChainType.HASHGRAPH]: {
            network: process.env.NODE_ENV === 'mainnet' ? 
              LedgerNetwork.HEDERA_MAINNET : 
              LedgerNetwork.HEDERA_TESTNET,
            credentials: process.env.NODE_ENV === 'mainnet' ? {
                accountId: process.env.PROD_NODE_ID,
                privateKey: process.env.PROD_NODE_PRIVATE_KEY,
                publicKey: process.env.PROD_NODE_PUBLIC_KEY
            } : {
                accountId: process.env.DEV_NODE_ID,
                privateKey: process.env.DEV_NODE_PRIVATE_KEY,
                publicKey: process.env.DEV_NODE_PUBLIC_KEY
            },
            options: {
                maxRetries: 3,
                timeout: 30000
            }
        },
        [ChainType.RIPPLE]: {
            network: null,
            credentials: null,
            options: null    
        }
    }
}));