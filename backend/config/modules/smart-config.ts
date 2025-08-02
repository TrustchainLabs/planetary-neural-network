import { ISmartNetwork } from "@hsuite/smart-network-types";
import { registerAs } from "@nestjs/config";
import { customLocalConfig } from "../settings/network/local.config";
import { customTestnetConfig } from "../settings/network/testnet.config";
import { customMainnetConfig } from "../settings/network/mainnet.config";

/**
 * Configuration for the smart config module.
 * @module SmartConfig
 */

/**
 * Registers and exports the smart config options.
 * @function
 * @returns {ISmartNetwork.INetwork.IConfig.IOptions} The smart config options.
 */
export default registerAs('smartConfig', (): ISmartNetwork.INetwork.IConfig.IOptions => ({
    /** @property {string} smartRegistryUrl - Smart registry URL for the smartconfig. */
    smartRegistryUrl: process.env.SMART_REGISTRY_URL,
    /** @property {string} baseUrl - Base URL for the smartconfig. */
    baseUrl: process.env.BASE_URL,
    /** @property {string} environment - Environment for the smartconfig. */
    environment: process.env.NODE_ENV,
    /** @property {string} network - Network for the smartconfig. */
    network: process.env.NETWORK || 'public',
    /** @property {string} client_environment - Client environment for the smartconfig. */
    client_environment: process.env.CLIENT_ENV,
    /** 
     * @property {Object} customNetwork - Custom network configuration for the smartconfig.
     * @property {null} customNetwork.local - Local network configuration.
     * @property {null} customNetwork.testnet - Testnet network configuration.
     * @property {null} customNetwork.mainnet - Mainnet network configuration.
     */
    customNetwork: {
        local: customLocalConfig,
        testnet: customTestnetConfig,
        mainnet: customMainnetConfig
    }
}))