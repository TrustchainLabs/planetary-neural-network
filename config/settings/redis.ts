import { registerAs } from "@nestjs/config";
import { Config } from "cache-manager";
import { RedisClientOptions } from "redis";

/**
 * Interface for Redis configuration combining RedisClientOptions and Config
 */
interface RedisConfig extends RedisClientOptions, Config {
    ttl: number;
}

/**
 * Configuration for Redis connection.
 * @module RedisConfig
 */
export default registerAs('redis', (): RedisConfig => ({
    /**
     * The hostname or IP address of the Redis server.
     * @type {string}
     */
    socket: {
        host: process.env.REDIS_URL || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
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
    database: Number(process.env.REDIS_DATABASE) || 0,

    /**
     * The time-to-live (TTL) for cached items in Redis.
     * @type {number}
     */
    ttl: Number(process.env.REDIS_TTL ? process.env.REDIS_TTL : 120)
}));