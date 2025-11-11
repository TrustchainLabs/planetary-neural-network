import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../constants';
import { User } from '../types';
import { LoggerUtil } from '../../../utils/logger/logger';

export interface SignUpParams {
  username: string;
  email: string;
  password: string;
  tags?: {
    key: string;
    value: string;
  }[];
}

export interface LoginParams {
  username?: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  operator?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.checkInitialAuthState());
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) {}

  private checkInitialAuthState(): boolean {
    // Check both web2 token AND wallet session
    return !!(
      localStorage.getItem('accessToken') || 
      this.hasActiveWalletSession()
    );
  }

  private hasActiveWalletSession(): boolean {
    // Check if there's a wallet session stored
    const walletSession = localStorage.getItem('walletSession');
    const walletConnected = localStorage.getItem('walletConnected');
    return !!(walletSession || walletConnected === 'true');
  }

  signUp(params: SignUpParams): Observable<any> {
    return this.http.post(`${API_BASE_URL}/auth/web2/register`, params);
  }

  login(params: LoginParams): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/auth/web2/login`, params)
      .pipe(
        tap(response => {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('user', JSON.stringify(response.user));
          if (response.operator) {
            localStorage.setItem('operator', JSON.stringify(response.operator));
          }
          this.isLoggedInSubject.next(true);
        })
      );
  }

  logout(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/auth/web2/logout`)
      .pipe(
        tap(() => {
          this.clearAuthState();
        })
      );
  }

  /**
   * Clear all authentication state (web2 and web3)
   */
  clearAuthState(): void {
    LoggerUtil.log('🧹 Clearing all auth state...');
    
    // Clear web2 state
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('operator');
    
    // Clear wallet state
    localStorage.removeItem('walletSession');
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletType');
    
    // Update observable
    this.isLoggedInSubject.next(false);
  }

  validateAuth(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/auth/profile`);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getCurrentUser(): User | null {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  }

  isAuthenticated(): boolean {
    return this.isLoggedInSubject.value;
  }

  /**
   * Login with wallet session
   */
  loginWithWallet(session: any): void {
    LoggerUtil.log('🔐 Logging in with wallet:', session);
    
    // Store wallet session info
    localStorage.setItem('walletSession', JSON.stringify(session));
    localStorage.setItem('walletConnected', 'true');
    localStorage.setItem('walletAddress', session.wallet);
    
    // Create a user object for wallet user
    const walletUser: User = {
      _id: session.wallet,
      email: `${session.wallet}@wallet.hedera`,
      username: `Wallet ${session.wallet.substring(0, 8)}...`,
      wallet: session.wallet,
      tags: []
    };
    
    localStorage.setItem('user', JSON.stringify(walletUser));
    
    // Mark as authenticated
    this.isLoggedInSubject.next(true);
    
    LoggerUtil.log('✅ Wallet login complete, user authenticated');
  }

  /**
   * Sync wallet session state
   */
  async syncWalletSession(): Promise<void> {
    const hasWalletSession = this.hasActiveWalletSession();
    const hasWeb2Session = !!localStorage.getItem('accessToken');
    
    const isAuthenticated = hasWalletSession || hasWeb2Session;
    
    LoggerUtil.log('🔄 Syncing wallet session:', {
      hasWalletSession,
      hasWeb2Session,
      isAuthenticated
    });
    
    this.isLoggedInSubject.next(isAuthenticated);
  }

  /**
   * Get connected wallet address
   */
  getUserWallet(): string | null {
    return localStorage.getItem('walletAddress');
  }

  /**
   * Check if user is logged in via wallet
   */
  isWalletAuthenticated(): boolean {
    return this.hasActiveWalletSession();
  }

  /**
   * Get wallet type (kabila, hashpack, etc)
   */
  getWalletType(): string | null {
    return localStorage.getItem('walletType');
  }
}
