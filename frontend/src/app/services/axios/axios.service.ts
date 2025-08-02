import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import { LoggerUtil } from '../../../utils/logger/logger';

/**
 * Service for managing API requests with wallet-specific sessions
 */
export class AxiosService {
  private static baseUrl: string;
  private static isConfigured: boolean = false;

  // Single shared axios instance
  private static instance: AxiosInstance;

  // For backward compatibility
  private static serviceInstance: AxiosService;

  // Map to store session cookie names for each wallet
  private static walletSessions: Map<string, string> = new Map();

  /**
   * Configure the service with a base URL
   * @param baseUrl - The base URL for API requests
   */
  public static configure(baseUrl: string): void {
    if (this.isConfigured) return;

    LoggerUtil.log(`Configuring AxiosService with baseUrl: ${baseUrl}`);
    this.baseUrl = baseUrl;

    // Create a single axios instance
    this.instance = axios.create({
      baseURL: this.baseUrl,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.isConfigured = true;

    // Load any saved sessions from localStorage
    this.loadSavedSessions();
  }

  /**
   * Backward compatibility method for existing services
   * @param baseUrl - The base URL for API requests
   * @returns An instance of AxiosService for backward compatibility
   */
  public static getInstance(baseUrl: string): AxiosService {
    if (!this.isConfigured) {
      this.configure(baseUrl);
    }

    if (!this.serviceInstance) {
      this.serviceInstance = new AxiosService();
    }

    return this.serviceInstance;
  }

  /**
   * Backward compatibility method to get the axios instance
   * @returns The axios instance
   */
  public getAxiosInstance(): AxiosInstance {
    return AxiosService.instance;
  }

  /**
   * Load saved session cookies from localStorage
   */
  private static loadSavedSessions(): void {
    try {
      LoggerUtil.log('🔍 DEBUG - Loading saved sessions from localStorage');
      const savedSessions = localStorage.getItem('wallet_sessions');

      if (savedSessions) {
        LoggerUtil.log(`🔍 DEBUG - Found saved sessions: ${savedSessions}`);

        try {
          const sessions = JSON.parse(savedSessions);

          // Clear current sessions first to avoid stale data
          this.walletSessions.clear();

          // Load sessions from storage
          Object.entries(sessions).forEach(([walletId, cookieName]) => {
            if (walletId && cookieName) {
              this.walletSessions.set(walletId, cookieName as string);
              LoggerUtil.log(`🔍 DEBUG - Loaded session cookie for wallet ${walletId}: ${cookieName}`);
            } else {
              LoggerUtil.log(`🔍 DEBUG - Skipping invalid session data for wallet ${walletId}`);
            }
          });

          LoggerUtil.log(`🔍 DEBUG - Loaded ${this.walletSessions.size} wallet sessions from storage`);
        } catch (parseError) {
          LoggerUtil.error('Error parsing saved sessions:', parseError);
          // If JSON parsing fails, remove the corrupted data
          localStorage.removeItem('wallet_sessions');
        }
      } else {
        LoggerUtil.log('🔍 DEBUG - No saved sessions found in localStorage');
      }
    } catch (error) {
      LoggerUtil.error('Error loading saved sessions:', error);
    }
  }

  /**
   * Save session cookies to localStorage
   */
  private static saveSessions(): void {
    try {
      const sessions: Record<string, string> = {};
      this.walletSessions.forEach((cookieName, walletId) => {
        sessions[walletId] = cookieName;
      });

      const sessionsJson = JSON.stringify(sessions);
      localStorage.setItem('wallet_sessions', sessionsJson);
      LoggerUtil.log(`🔍 DEBUG - Saved ${Object.keys(sessions).length} sessions to localStorage: ${sessionsJson}`);
    } catch (error) {
      LoggerUtil.error('Error saving sessions:', error);
    }
  }

  /**
   * Set the session cookie name for a specific wallet
   * @param walletId - The wallet identifier
   * @param cookieName - The session cookie name from login response
   */
  public static setSessionCookie(walletId: string, cookieName: string): void {
    if (!walletId || !cookieName) return;

    LoggerUtil.log(`🔍 DEBUG - Setting session cookie for wallet ${walletId}: ${cookieName}`);
    this.walletSessions.set(walletId, cookieName);
    this.saveSessions();

    // Verify the cookie was stored correctly
    const storedCookie = this.walletSessions.get(walletId);
    LoggerUtil.log(`🔍 DEBUG - Verified stored cookie for ${walletId}: ${storedCookie}`);
  }

  /**
   * Get the session cookie name for a specific wallet
   * @param walletId - The wallet identifier
   * @returns The session cookie name or undefined
   */
  public static getSessionCookie(walletId: string): string | undefined {
    return this.walletSessions.get(walletId);
  }

  /**
   * Add the wallet's session cookie to the request config
   * @param walletId - The wallet identifier
   * @param config - The original axios config
   * @returns The config with wallet session headers
   */
  private static addSessionHeader(walletId: string, config: AxiosRequestConfig = {}): AxiosRequestConfig {
    LoggerUtil.log(`🔍 DEBUG - Adding headers for wallet: ${walletId}`);

    // Debug all current stored sessions
    LoggerUtil.log('🔍 DEBUG - All current wallet sessions:');
    this.walletSessions.forEach((cookie, id) => {
      LoggerUtil.log(`- Wallet ${id}: Cookie = ${cookie}`);
    });

    const sessionCookie = this.walletSessions.get(walletId);

    // Create a new config object to avoid modifying the original
    const newConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        ...config.headers,
        'X-Debug-Session': 'true' // Add debug header for backend logging
      }
    };

    // Add the wallet ID to the headers
    newConfig.headers['X-Wallet-ID'] = walletId;

    // Add the session cookie header if available
    if (sessionCookie) {
      newConfig.headers['x-session-cookie'] = sessionCookie;
      LoggerUtil.log(`🔍 DEBUG - Using session cookie for wallet ${walletId}: ${sessionCookie}`);
    } else {
      LoggerUtil.log(`🔍 DEBUG - ⚠️ No session cookie available for wallet ${walletId}`);
    }

    // Log all headers being sent
    LoggerUtil.log('🔍 DEBUG - Request headers:', newConfig.headers);

    return newConfig;
  }

  /**
   * Make a public GET request without wallet authentication
   */
  public static async getPublic<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    if (!this.isConfigured) {
      throw new Error('AxiosService must be configured with a baseUrl before use');
    }

    return this.instance.get(url, config);
  }

  /**
   * Make a GET request with a specific wallet identity
   */
  public static async get<T = any>(walletId: string, url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    if (!this.isConfigured) {
      throw new Error('AxiosService must be configured with a baseUrl before use');
    }

    if (!walletId) {
      throw new Error('Wallet ID is required for making requests');
    }

    const walletConfig = this.addSessionHeader(walletId, config);
    return this.instance.get(url, walletConfig);
  }

  /**
   * Make a POST request with a specific wallet identity
   */
  public static async post<T = any>(walletId: string, url: string, data: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    if (!this.isConfigured) {
      throw new Error('AxiosService must be configured with a baseUrl before use');
    }

    if (!walletId) {
      throw new Error('Wallet ID is required for making requests');
    }

    const walletConfig = this.addSessionHeader(walletId, config);
    return this.instance.post(url, data, walletConfig);
  }

  /**
   * Make a PUT request with a specific wallet identity
   */
  public static async put<T = any>(walletId: string, url: string, data: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    if (!this.isConfigured) {
      throw new Error('AxiosService must be configured with a baseUrl before use');
    }

    if (!walletId) {
      throw new Error('Wallet ID is required for making requests');
    }

    const walletConfig = this.addSessionHeader(walletId, config);
    return this.instance.put(url, data, walletConfig);
  }

  /**
   * Make a DELETE request with a specific wallet identity
   */
  public static async delete<T = any>(walletId: string, url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    if (!this.isConfigured) {
      throw new Error('AxiosService must be configured with a baseUrl before use');
    }

    if (!walletId) {
      throw new Error('Wallet ID is required for making requests');
    }

    const walletConfig = this.addSessionHeader(walletId, config);
    return this.instance.delete(url, walletConfig);
  }

  /**
   * Make a PATCH request with a specific wallet identity
   */
  public static async patch<T = any>(walletId: string, url: string, data: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    if (!this.isConfigured) {
      throw new Error('AxiosService must be configured with a baseUrl before use');
    }

    if (!walletId) {
      throw new Error('Wallet ID is required for making requests');
    }

    const walletConfig = this.addSessionHeader(walletId, config);
    return this.instance.patch(url, data, walletConfig);
  }

  /**
   * Clear a specific wallet's session
   */
  public static clearSession(walletId: string): void {
    this.walletSessions.delete(walletId);
    this.saveSessions();
    LoggerUtil.log(`Cleared session for wallet ${walletId}`);
  }

  /**
   * Clear all sessions
   */
  public static clearAllSessions(): void {
    this.walletSessions.clear();
    localStorage.removeItem('wallet_sessions');
    LoggerUtil.log('Cleared all sessions');
  }

  /**
   * Debug method to show current sessions
   */
  public static debugSessions(): void {
    LoggerUtil.log('Active wallet sessions:');
    this.walletSessions.forEach((cookieName, walletId) => {
      LoggerUtil.log(`- ${walletId}: ${cookieName}`);
    });
  }

  /**
   * Debug utility to compare localStorage sessions with memory sessions
   * Call this method to check if there's a discrepancy between stored and in-memory sessions
   */
  public static compareStorageWithMemory(): void {
    LoggerUtil.log('🔍 DEBUG - Comparing localStorage sessions with memory sessions:');

    // Check localStorage
    try {
      const savedSessions = localStorage.getItem('wallet_sessions');
      if (savedSessions) {
        LoggerUtil.log('🔍 DEBUG - localStorage wallet_sessions:', savedSessions);
        const sessions = JSON.parse(savedSessions);

        // Compare with in-memory sessions
        LoggerUtil.log('🔍 DEBUG - In-memory sessions:');
        this.walletSessions.forEach((cookieName, walletId) => {
          const storedCookie = sessions[walletId];
          if (storedCookie === cookieName) {
            LoggerUtil.log(`✅ Wallet ${walletId}: Match - ${cookieName}`);
          } else {
            LoggerUtil.log(`❌ Wallet ${walletId}: MISMATCH - Memory: ${cookieName}, Storage: ${storedCookie || 'undefined'}`);
          }
        });

        // Check for sessions in localStorage but not in memory
        Object.entries(sessions).forEach(([walletId, cookieName]) => {
          if (!this.walletSessions.has(walletId)) {
            LoggerUtil.log(`❓ Wallet ${walletId}: In localStorage but not in memory - ${cookieName}`);
          }
        });
      } else {
        LoggerUtil.log('🔍 DEBUG - No wallet_sessions in localStorage!');
      }
    } catch (error) {
      LoggerUtil.error('Error comparing sessions:', error);
    }

    // Check current browser cookies
    LoggerUtil.log('🔍 DEBUG - Current document.cookie:', document.cookie);
  }
}

export default AxiosService;
