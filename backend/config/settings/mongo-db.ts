import { registerAs } from "@nestjs/config";

/**
 * Configuration for the MongoDB.
 * @module MongoDbConfig
 */

/**
 * Registers and exports the MongoDB configuration.
 * @function
 * @returns {Object} The MongoDB configuration object.
 */
export default registerAs('mongoDb', (): {url: string} => ({
    /**
     * The MongoDB connection URL.
     * Uses production URL for mainnet, development URL otherwise.
     * @type {string}
     */
    url: process.env.NODE_ENV == 'mainnet' ? process.env.PROD_MONGO_DB : process.env.DEV_MONGO_DB,
}));