/**
 * Configuration module for IPFS (InterPlanetary File System) integration.
 * Provides settings for connecting to IPFS gateways and nodes in the Smart Registry application.
 * 
 * @module IpfsConfig
 * @category Configuration
 */

import { registerAs } from "@nestjs/config";
import { IIPFS } from "@hsuite/ipfs";

/**
 * Registers and exports the IPFS configuration settings.
 * Creates a configuration object that includes gateway URLs for content retrieval
 * and node connection details for IPFS interactions.
 * 
 * @function
 * @returns {IIPFS.IOptions} Configuration object containing:
 * - gatewaysUrls: Array of IPFS gateway URLs for content access
 * - nodeUrl: URL for connecting to an IPFS node
 * @example
 * // Example usage in a service
 * @Inject('CONFIG')
 * private readonly config: ConfigType<typeof ipfsConfig>;
 * 
 * // Access gateway URLs
 * const gateways = this.config.gatewaysUrls;
 * 
 * // Access node URL
 * const nodeEndpoint = this.config.nodeUrl;
 */
export default registerAs('ipfs', (): IIPFS.IOptions => ({
    /**
     * List of IPFS gateway URLs used for retrieving content from the IPFS network.
     * Gateways provide HTTP access to IPFS content without running a local node.
     * Falls back to a default list of reliable public gateways if not configured.
     * 
     * @type {string[]}
     * @default [Array of public IPFS gateways]
     * @example
     * // Environment variable format
     * IPFS_GATEWAYS_URLS=https://gateway1.com/ipfs/,https://gateway2.com/ipfs/
     */
    gatewaysUrls: process.env.IPFS_GATEWAYS_URLS?.split(',') || [
        'https://cloudflare-ipfs.com/ipfs/',
        'https://gateway.pinata.cloud/ipfs/',
        'https://dweb.link/ipfs/',
        'https://ipfs.4everland.io/ipfs/',
        'https://gateway.ipfs.io/ipfs/',
        'https://ipfs.fleek.co/ipfs/',
        'https://ipfs.infura.io/ipfs/',
        'https://nftstorage.link/ipfs/',
        'https://w3s.link/ipfs/'
    ],

    /**
     * URL of the IPFS node to connect to for direct IPFS network interactions.
     * This endpoint is used for operations like adding content to IPFS or
     * querying IPFS data directly through the node's API.
     * 
     * @type {string}
     * @default 'http://127.0.0.1:5001/api/v0'
     * @example
     * // Environment variable format
     * IPFS_NODE_URL=http://localhost:5001/api/v0
     */
    nodeUrl: process.env.IPFS_NODE_URL || 'http://127.0.0.1:5001/api/v0'
}));