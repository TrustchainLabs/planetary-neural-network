import { IThrottler } from "@hsuite/throttler-types";
import { registerAs } from "@nestjs/config";

/**
 * Configuration for the throttler module.
 * @module
 */

/**
 * Registers the throttler configuration.
 * @function
 * @returns {IThrottler.IOptions} The throttler configuration options.
 */
export default registerAs('throttler', (): IThrottler.IOptions => ({
    /** Enables or disables the throttler. */
    enabled: true,
    /** Throttler settings. */
    settings: {
        /** Time-to-live in seconds. */
        ttl: 60,
        /** Maximum number of requests within the TTL. */
        limit: 250
    },
    /** Storage type for the throttler. */
    storage: IThrottler.IStorage.REDIS,
    /** Redis configuration for the throttler. */
    redis: {
      /** @property {Object} socket - Redis server socket configuration. */
      socket: {
        /** @property {string} host - Redis server host. */
        host: process.env.REDIS_URL,
        /** @property {number} port - Redis server port. */
        port: Number(process.env.REDIS_PORT)
      },
      /** Redis server password. */
      password: process.env.REDIS_PASSWORD,
      /** Redis server username. */
      username: process.env.REDIS_USERNAME || 'default',
      /** Redis server database. */
      database: Number(process.env.REDIS_DATABASE),
      /** Time-to-live for Redis keys in seconds. */
      ttl: Number(process.env.REDIS_TTL) || 120
    },
}));