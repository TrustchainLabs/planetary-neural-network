import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LoggerUtil } from '../../../utils/logger/logger';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    // Sync wallet session before checking auth
    this.authService.syncWalletSession();
    
    return this.authService.isLoggedIn$.pipe(
      tap(isLoggedIn => {
        LoggerUtil.log('🔐 AuthGuard check:', {
          isLoggedIn,
          hasWallet: this.authService.isWalletAuthenticated(),
          hasToken: !!this.authService.getAccessToken()
        });
        
        if (!isLoggedIn) {
          LoggerUtil.log('❌ Not authenticated, redirecting to login');
          this.router.navigate(['/login']);
        } else {
          LoggerUtil.log('✅ Authenticated, allowing access');
        }
      }),
      map(isLoggedIn => isLoggedIn)
    );
  }
}
