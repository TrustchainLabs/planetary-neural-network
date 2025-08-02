import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';

export interface BetProgressEvent {
  type: 'bet_started' | 'payment_processed' | 'bet_submitted' | 'results_generated' | 'payout_processed' | 'game_stored' | 'bet_completed' | 'error' | 'refund_processing' | 'refund_completed' | 'refund_failed';
  message: string;
  data?: any;
  timestamp: string;
  sessionId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BetProgressSocketService {
  private socket: Socket | null = null;
  private connectionState = new BehaviorSubject<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  private progressEvents = new BehaviorSubject<BetProgressEvent[]>([]);
  private currentWalletId: string | null = null;

  // Configurable socket URL - should match your backend
  private readonly SOCKET_URL = 'http://localhost:8888'; // Update this to match your backend URL
  private readonly NAMESPACE = 'bet-progress';

  constructor() {}

  /**
   * Get connection state as observable
   */
  getConnectionState(): Observable<'disconnected' | 'connecting' | 'connected' | 'error'> {
    return this.connectionState.asObservable();
  }

  /**
   * Get progress events as observable
   */
  getProgressEvents(): Observable<BetProgressEvent[]> {
    return this.progressEvents.asObservable();
  }

  /**
   * Connect to WebSocket and identify user
   */
  connect(walletId: string): void {
    if (this.socket && this.socket.connected && this.currentWalletId === walletId) {
      console.log('🔌 [BetProgressSocket] Already connected for wallet:', walletId);
      return;
    }

    this.disconnect(); // Disconnect any existing connection
    this.connectionState.next('connecting');
    this.currentWalletId = walletId;

    console.log('🔌 [BetProgressSocket] Connecting to WebSocket...', `${this.SOCKET_URL}/${this.NAMESPACE}`);

    this.socket = io(`${this.SOCKET_URL}/${this.NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

        // Handle connection success
    this.socket.on('connect', () => {
      console.log('✅ [BetProgressSocket] Connected to WebSocket server');
      this.connectionState.next('connected');

      // Identify the user with the server
      this.socket!.emit('identify', { walletId });
    });

    // Handle welcome message
    this.socket.on('welcome', (data: any) => {
      console.log('👋 [BetProgressSocket] Welcome message received:', data);
    });

    // Handle identification confirmation
    this.socket.on('identified', (data: any) => {
      console.log('🆔 [BetProgressSocket] User identified successfully:', data);
    });

    // Handle bet progress events
    this.socket.on('bet_progress', (event: BetProgressEvent) => {
      console.log('📊 [BetProgressSocket] Received bet progress event:', event);

      // Add to events array
      const currentEvents = this.progressEvents.value;
      const newEvents = [...currentEvents, event];

      // Keep only last 10 events to prevent memory issues
      if (newEvents.length > 10) {
        newEvents.splice(0, newEvents.length - 10);
      }

      this.progressEvents.next(newEvents);
    });

    // Handle disconnection
    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ [BetProgressSocket] Disconnected from WebSocket server:', reason);
      this.connectionState.next('disconnected');
    });

    // Handle connection errors
    this.socket.on('connect_error', (error: any) => {
      console.error('🚫 [BetProgressSocket] Connection error:', error);
      this.connectionState.next('error');
    });

    // Handle server errors
    this.socket.on('error', (error: any) => {
      console.error('🚫 [BetProgressSocket] Server error:', error);
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 [BetProgressSocket] Disconnecting from WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.currentWalletId = null;
      this.connectionState.next('disconnected');
    }
  }

  /**
   * Clear progress events
   */
  clearEvents(): void {
    this.progressEvents.next([]);
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current wallet ID
   */
  getCurrentWalletId(): string | null {
    return this.currentWalletId;
  }

  /**
   * Manually emit a test event (for debugging)
   */
  emitTestEvent(): void {
    if (this.socket && this.socket.connected) {
      const testEvent: BetProgressEvent = {
        type: 'bet_started',
        message: 'Test event from frontend',
        timestamp: new Date().toISOString()
      };
      console.log('🧪 [BetProgressSocket] Emitting test event:', testEvent);
      // Note: This would emit to server if you have a test endpoint
    }
  }
}
