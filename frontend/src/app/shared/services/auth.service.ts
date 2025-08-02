import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../constants';
import { User } from '../types';

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
    return !!localStorage.getItem('accessToken');
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
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          localStorage.removeItem('operator');
          this.isLoggedInSubject.next(false);
        })
      );
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
}
