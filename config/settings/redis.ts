import { registerAs } from "@nestjs/config";
import { Config } from "cache-manager";
import { RedisClientOptions } from "redis";

/**
 * Configuration for Redis connection.
 * @module RedisConfig
 */
export default registerAs('redis', (): RedisClientOptions & Config => ({
    /**
     * The hostname or IP address of the Redis server.
     * @type {string}
     */
    socket: {
        host: process.env.REDIS_URL,
        port: Number(process.env.REDIS_PORT),
    },

    /**
     * The authentication password for the Redis server.
     * @type {string}
     */
    password: process.env.REDIS_PASSWORD,

    /**
     * The username for the Redis server.
     * @type {string}
     */
    username: process.env.REDIS_USERNAME || 'default',

    /**
     * The database number for the Redis server.
     * @type {number}
     */
    database: Number(process.env.REDIS_DATABASE),

    /**
     * The time-to-live (TTL) for cached items in Redis.
     * @type {number}
     */
    ttl: Number(process.env.REDIS_TTL ? process.env.REDIS_TTL : 120)
}));