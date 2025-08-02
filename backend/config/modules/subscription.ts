import { ChainType } from "@hsuite/smart-ledgers";
import { ISubscription } from "@hsuite/subscriptions-types";
import { registerAs } from "@nestjs/config";

/**
 * Configuration module for managing subscription plans and features.
 * This module handles subscription-related configurations including plan tiers,
 * pricing, request limits, token gating, and Redis connection settings.
 * @module Subscription
 * @category Configuration
 */

/**
 * Helper function to decode base64 and parse JSON
 * @param base64String The base64 encoded JSON string
 * @returns Parsed JSON object
 */
function decodeAndParseJson(base64String: string) {
    const decodedString = Buffer.from(base64String, 'base64').toString('utf-8');
    return JSON.parse(decodedString);
}

/**
 * Registers and exports the subscription configuration settings.
 * Creates a configuration object that includes subscription plans (Basic, Premium, Enterprise),
 * token gating options, and Redis connection details.
 * 
 * @function
 * @returns {ISubscription.IConfig.IOptions} Configuration object containing:
 * - enabled: Master switch for subscription functionality
 * - issuer: Settings for subscription token issuance and management
 * - tokenGate: Configuration for subscription access control
 * - utilities: Additional subscription-related utilities
 */
export default registerAs('subscription', (): ISubscription.IConfig.IOptions => ({
    /**
     * Master switch to enable/disable the subscription module functionality
     * @type {boolean}
     */
    enabled: true,

    /**
     * Configuration for subscription token issuance and management
     * @type {Object}
     */
    issuer: {
        /**
         * Controls whether the token issuer functionality is active
         * @type {boolean}
         */
        enabled: true,

        /**
         * Detailed configuration options for the subscription issuer
         * @type {Object}
         */
        options: {
            /**
             * Token gate ID used for logging subscription activities
             * Different IDs are used for mainnet and development environments
             * @type {string}
             */
            loggerTokenGateId: process.env.NODE_ENV == 'mainnet' ?
                process.env.PROD_SMART_APP_TOKEN_GATE_ID :
                process.env.DEV_SMART_APP_TOKEN_GATE_ID,

            /**
             * Array of additional utility configurations for the subscription system
             * @type {Array}
             */
            utilities: [],

            /**
             * Payment method configuration
             * @type {Object}
             */
            paymentMethod: process.env.NODE_ENV == 'mainnet' ? {
                chain: (process.env.LEDGER || ChainType.HASHGRAPH) as ChainType,
                tokenId: process.env.PROD_SUBSCRIPTIONS_PAYMENT_TOKEN_ID,
                coingeckoId: process.env.SUBSCRIPTIONS_PAYMENT_COINGECKO_ID,
                decimals: Number(process.env.PROD_SUBSCRIPTIONS_PAYMENT_DECIMALS)
            } : {
                chain: (process.env.LEDGER || ChainType.HASHGRAPH) as ChainType,
                tokenId: process.env.DEV_SUBSCRIPTIONS_PAYMENT_TOKEN_ID,
                coingeckoId: process.env.SUBSCRIPTIONS_PAYMENT_COINGECKO_ID,
                decimals: Number(process.env.DEV_SUBSCRIPTIONS_PAYMENT_DECIMALS)
            },          

            /**
             * Token configuration for subscription management
             * Contains different settings for mainnet and development environments
             * @type {Object}
             */
            token: process.env.NODE_ENV == 'mainnet' ? {
                /** Production subscription token identifier */
                id: process.env.PROD_SUBSCRIPTIONS_TOKEN_ID,
                /** Private key for managing token supply in production */
                supplyKey: process.env.PROD_NODE_PRIVATE_KEY,
                /** Private key for token freeze operations in production */
                freezeKey: process.env.PROD_NODE_PRIVATE_KEY,
                /** Metadata of the token */
                metadata: {
                    content: decodeAndParseJson(process.env.SUBSCRIPTIONS_METADATA),
                    cid: process.env.SUBSCRIPTIONS_CID
                }
            } : {
                /** Development subscription token identifier */
                id: process.env.DEV_SUBSCRIPTIONS_TOKEN_ID,
                /** Private key for managing token supply in development */
                supplyKey: process.env.DEV_NODE_PRIVATE_KEY,
                /** Private key for token freeze operations in development */
                freezeKey: process.env.DEV_NODE_PRIVATE_KEY,
                /** Metadata of the token */
                metadata: {
                    content: decodeAndParseJson(process.env.SUBSCRIPTIONS_METADATA),
                    cid: process.env.SUBSCRIPTIONS_CID
                }                
            },

            /**
             * Redis connection configuration for subscription data storage
             * @type {Object}
             */
            redis: {
                /** Socket configuration for Redis connection */
                socket: {
                    /** Redis server hostname or IP address */
                    host: process.env.REDIS_URL,
                    /** Redis server port number */
                    port: Number(process.env.REDIS_PORT)
                },
                /** Redis server authentication password */
                password: process.env.REDIS_PASSWORD,
                /** Redis server username, defaults to 'default' */
                username: process.env.REDIS_USERNAME || 'default',
                /** Redis database number for subscription data */
                database: Number(process.env.REDIS_DATABASE),
                /** Time-to-live for Redis keys in seconds */
                ttl: Number(process.env.REDIS_TTL) || 120
            },

            /**
             * Subscription plan configurations defining different service tiers
             * @type {Object}
             */
            config: {
                /**
                 * Basic subscription plan configuration
                 * Suitable for small projects and startups
                 * @type {Object}
                 */
                basic: {
                    /** Plan description */
                    description: 'For small projects and startups.',
                    /** Plan display image URL */
                    image: 'https://gateway.pinata.cloud/ipfs/QmQQ4oU81Sck7bzi5oUebpK1wDzezUe67tDoRVKpFWcjd8?ngsw-bypass=true&img-width=300',
                    /** Plan pricing options */
                    price: {
                        monthly: 10,
                        yearly: 100
                    },
                    /** API request limits per method */
                    requests: {
                        get: 500,
                        post: 500,
                        put: 500,
                        delete: 500,
                        patch: 500
                    }
                },

                /**
                 * Premium subscription plan configuration
                 * Designed for medium-sized projects and growing startups
                 * @type {Object}
                 */
                premium: {
                    /** Plan description */
                    description: 'For medium projects and startups.',
                    /** Plan display image URL */
                    image: 'https://gateway.pinata.cloud/ipfs/Qmf1gV4ZgcFASEdSotjdbRzxj7LRd8HyBmFpZSnn8Lw9ua?ngsw-bypass=true&img-width=300',
                    /** Plan pricing options */
                    price: {
                        monthly: 50,
                        yearly: 500
                    },
                    /** API request limits per method */
                    requests: {
                        get: 2500,
                        post: 2500,
                        put: 2500,
                        delete: 2500,
                        patch: 2500
                    }
                },

                /**
                 * Enterprise subscription plan configuration
                 * Tailored for large projects and enterprise customers
                 * @type {Object}
                 */
                enterprise: {
                    /** Plan description */
                    description: 'For large projects and enterprises.',
                    /** Plan display image URL */
                    image: 'https://gateway.pinata.cloud/ipfs/QmNVjYbYUKKnAL8vFCWM26Kk6uvCfy5VWepJgynvd29RkT?ngsw-bypass=true&img-width=300',
                    /** Plan pricing options */
                    price: {
                        monthly: 100,
                        yearly: 1000
                    },
                    /** API request limits per method */
                    requests: {
                        get: 5000,
                        post: 5000,
                        put: 5000,
                        delete: 5000,
                        patch: 5000
                    }
                }
            },
        }
    },

    /**
     * Configuration for subscription access control via token gating
     * @type {Object}
     */
    tokenGate: {
        /**
         * Token gating status
         * @type {boolean}
         * @description Enables/disables access control through token gating
         */
        enabled: false,

        /**
         * Token gating options
         * @type {Object}
         * @description Specific settings for token gating behavior and rules
         */
        options: {
            /**
             * Type of guard to implement
             * @type {('subscriptions' | 'token-gate')}
             * @description Specifies which guard strategy to use for access control
             * @remarks Set via GUARD_TYPE environment variable
             */
            guardType: 'subscriptions'
        }
    },

    /**
     * Array of additional utilities for the subscription system
     * Can be extended with custom functionality as needed
     * @type {Array}
     */
    utilities: []
}));