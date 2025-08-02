import { IAuth } from "@hsuite/auth-types";
import { registerAs } from "@nestjs/config";
import client from "./client";

/**
 * Configuration for the authentication module.
 * @module Authentication
 */

/**
 * Registers and exports the authentication configuration.
 * @function
 * @returns {IAuth.IConfiguration.IAuthentication} The authentication configuration options.
 */
export default registerAs('authentication', (): IAuth.IConfiguration.IAuthentication => ({
    /** @property {boolean} enabled - Indicates if the authentication module is enabled. */
    enabled: false,
    /** @property {Object} commonOptions - Common options for authentication. */
    commonOptions: {
        /** @property {Object} redis - Redis configuration for session storage. */
        redis: {
            /** @property {number} ttl - Time to live for Redis keys in seconds. */
            ttl: 120,
            /** @property {Object} socket - Redis connection socket configuration. */
            socket: {
                /** @property {string} host - Redis server host. */
                host: process.env.REDIS_URL,
                /** @property {number} port - Redis server port. */
                port: Number(process.env.REDIS_PORT),
            },
            /** @property {string} password - Redis server password. */
            password: process.env.REDIS_PASSWORD
        },
        /** @property {Object} jwt - JWT configuration. */
        jwt: {
            /** @property {string} secret - Secret key for JWT signing. */
            secret: process.env.SESSION_SECRET,
            /** @property {Object} signOptions - Options for JWT signing. */
            signOptions: {
                /** @property {string} expiresIn - JWT expiration time. */
                expiresIn: '1h'
            },
        },
        /** @property {Object} cookieOptions - Options for authentication cookies. */
        cookieOptions: {
            /** @property {string} sameSite - SameSite cookie policy. */
            sameSite: process.env.NODE_ENV == 'mainnet' ? 'strict' : 'lax',
            /** @property {boolean} httpOnly - Whether the cookie is HTTP only. */
            httpOnly: true,
            /** @property {number} maxAge - Maximum age of the cookie in milliseconds. */
            maxAge: 60000 * 60 * 24 * 7,
            /** @property {boolean} secure - Whether the cookie is secure. */
            secure: process.env.CLIENT_ENV == 'local-node' ? false : true
        },
        /** @property {IAuth.IConfiguration.IPassportStrategy} passport - Passport strategy to use. */
        passport: IAuth.IConfiguration.IPassportStrategy.REDIS,
        /** @property {string} appName - Name of the application. */
        appName: 'Dao',
        /** @property {Object} operator - Operator configuration from client module. */
       operator: client().ledgers[process.env.LEDGER].credentials
    },
    /** @property {Object} web2Options - Web2 authentication configuration. */
    web2Options: {
        /** @property {boolean} confirmation_required - Whether email confirmation is required. */
        confirmation_required: false,
        /** @property {boolean} admin_only - Whether authentication is restricted to admins only. */
        admin_only: false,
        /** @property {Object} sendMailOptions - Options for sending emails. */
        sendMailOptions: {
            /** @property {Object} reset - Options for password reset emails. */
            reset: {
                /** @property {string} from - Sender email address. */
                from: process.env.MAIL_USER,
                /** @property {string} subject - Email subject for password reset. */
                subject: 'YourBrand - Password Recovery',
                /** @property {string} text - Plain text content for password reset email. */
                text: process.env.NODE_ENV == 'testnet' ?
                    `If you want to recover your password, please click on the following link: ${process.env.DEV_FRONTEND_DOMAIN}/#/intro?token=PLACE_HOLDER_FOR_TOKEN`
                    : `If you want to recover your password, please click on the following link: ${process.env.PROD_FRONTEND_DOMAIN}/#/intro?token=PLACE_HOLDER_FOR_TOKEN`,
                /** @property {string} html - HTML content for password reset email. */
                html: process.env.NODE_ENV == 'testnet' ?
                    `If you want to recover your password, please click on the following link: ${process.env.DEV_FRONTEND_DOMAIN}/#/intro?token=PLACE_HOLDER_FOR_TOKEN`
                    : `If you want to recover your password, please click on the following link: ${process.env.PROD_FRONTEND_DOMAIN}/#/intro?token=PLACE_HOLDER_FOR_TOKEN`,
            },
            /** @property {Object} confirm - Options for email confirmation. */
            confirm: {
                /** @property {string} from - Sender email address. */
                from: process.env.MAIL_USER,
                /** @property {string} subject - Email subject for confirmation. */
                subject: 'YourBrand - Password Recovery',
                /** @property {string} text - Plain text content for confirmation email. */
                text: process.env.NODE_ENV == 'testnet' ?
                    `Welcome to Banqua, please confirm your email by clicking on the following link: ${process.env.DEV_FRONTEND_DOMAIN}/#/email_confirmation?token=PLACE_HOLDER_FOR_TOKEN`
                    : `Welcome to Banqua, please confirm your email by clicking on the following link: ${process.env.PROD_FRONTEND_DOMAIN}/#/email_confirmation?token=PLACE_HOLDER_FOR_TOKEN`,
                /** @property {string} html - HTML content for confirmation email. */
                html: process.env.NODE_ENV == 'testnet' ?
                    `Welcome to Banqua, please confirm your email by clicking on the following link: ${process.env.DEV_FRONTEND_DOMAIN}/#/email_confirmation?token=PLACE_HOLDER_FOR_TOKEN`
                    : `Welcome to Banqua, please confirm your email by clicking on the following link: ${process.env.PROD_FRONTEND_DOMAIN}/#/email_confirmation?token=PLACE_HOLDER_FOR_TOKEN`,
            }
        },
        /** @property {Object} mailerOptions - Options for the mailer service. */
        mailerOptions: {
            /** @property {Object} transport - Transport configuration for the mailer. */
            transport: {
                /** @property {string} host - SMTP host. */
                host: process.env.MAIL_HOST,
                /** @property {number} port - SMTP port. */
                port: Number(process.env.MAIL_PORT),
                /** @property {boolean} secure - Whether to use TLS. */
                secure: true,
                /** @property {boolean} debug - Whether to enable debug mode. */
                debug: false,
                /** @property {boolean} logger - Whether to enable logging. */
                logger: false,
                /** @property {Object} auth - Authentication details for SMTP. */
                auth: {
                    /** @property {string} user - SMTP username. */
                    user: process.env.MAIL_USER,
                    /** @property {string} pass - SMTP password. */
                    pass: process.env.MAIL_PASSWORD
                }
            }
        },
        /** @property {Object} twilioOptions - Options for Twilio integration. */
        twilioOptions: {
            /** @property {boolean} enabled - Whether Twilio integration is enabled. */
            enabled: false,
            /** @property {Object} twilioSecrets - Twilio API credentials. */
            twilioSecrets: {
                /** @property {string} accountSid - Twilio account SID. */
                accountSid: process.env.TWILIO_ACCOUNT_SID,
                /** @property {string} authToken - Twilio auth token. */
                authToken: process.env.TWILIO_AUTH_TOKEN,
                /** @property {string} serviceSid - Twilio service SID. */
                serviceSid: process.env.TWILIO_SERVICE_SID
            }
        }
    },
    /** @property {Object} web3Options - Web3 authentication configuration. */
    web3Options: {
        /** @property {Object} tokenGateOptions - Options for token gating. */
        tokenGateOptions: {
            /** @property {boolean} enabled - Whether token gating is enabled. */
            enabled: false,
            /** @property {Array} roles - Array of roles for token gating. */
            roles: []
        }
    }
}));