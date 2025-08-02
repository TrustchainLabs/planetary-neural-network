import { Injectable } from '@angular/core';
import { SignClientTypes, SessionTypes } from '@walletconnect/types'
import { Transaction, AccountId, LedgerId, PublicKey, SignerSignature, SignatureMap, TokenAssociateTransaction, TokenId } from '@hashgraph/sdk'
import { proto } from '@hashgraph/proto'
import { HederaSessionEvent, HederaJsonRpcMethod, transactionToBase64String, base64StringToSignatureMap, ExecuteTransactionParams, SignMessageParams, SignAndExecuteTransactionParams, DAppConnector, HederaChainId, verifyMessageSignature, SignAndExecuteTransactionResult, ExecuteTransactionResult, Uint8ArrayToBase64String, SignMessageResult, SignTransactionParams, transactionBodyToBase64String, transactionToTransactionBody, } from '@kabila-tech/hedera-wallet-connect'
import { environment } from 'src/environments/environment'
import * as lodash from 'lodash';
import { Subject, Observable } from 'rxjs';
import { Buffer } from 'buffer';
import { AxiosService } from './axios/axios.service';
import { AxiosError } from 'axios';
import { LoggerUtil } from '../../utils/logger/logger';

export interface WC_Session {
  topic: string
  wallet: string
  alias: string
  id: string
  publicKey: string
}

interface WalletEvent {
  type: string;
  payload?: any;
  content: {
    message: string;
    type: 'success' | 'error' | 'loading';
    method?: string;
    data?: any;
  };
}

interface WalletExtension {
  name: string;
  id: string;
  image: string;
}

@Injectable({
  providedIn: 'root'
})
export class WalletConnectService {
  private dAppConnector: DAppConnector | undefined
  private readonly projectId: string = '9c0251b8e667472a75a2147bdce1b614'
  private readonly messagePrefix: string = '\x19Hedera Signed Message:\n'
  private readonly metadata: SignClientTypes.Metadata = {
    name: 'Shibar DAPP',
    description: 'Powered By SmartNode Technology and Hedera Hashgraph',
    url: 'https://shibar.app',
    icons: [
      'https://gateway.pinata.cloud/ipfs/QmYXoedB1DV5gZZ5EUjxQKjNPabA6ArVA4sbEeWf3mwabS?ngsw-bypass=true&img-width=300',
      'https://shibar.app/assets/icons/icon-192x192.png'
    ],
  }

  private _eventsObserver = new Subject<WalletEvent>();
  private eventsObservable = this._eventsObserver.asObservable();
  private readonly _walletExtensions: WalletExtension[] = [
    {
      name: 'walletconnect',
      id: 'walletconnect',
      image: 'assets/wallets/wallet-connect.webp'
    },
    {
      name: 'kabila',
      id: 'cnoepnljjcacmnjnopbhjelpmfokpijm',
      image: 'assets/wallets/kabila.svg'
    },
    {
      name: 'hashpack',
      id: 'gjagmgiddbbciopjhllkdnddhcglnemk',
      image: 'assets/wallets/hashpack.webp'
    }
  ]

  private session: any = null;

  constructor() {
    AxiosService.configure(environment.smartAppUrl);
  }

  get signer(): any {
    return this.dAppConnector!.signers[0];
  }

  get walletExtensions(): WalletExtension[] {
    return this._walletExtensions;
  }

  get eventsObserver(): Observable<WalletEvent> {
    return this.eventsObservable;
  }

  triggerEvent(event: WalletEvent) {
    this._eventsObserver.next(event);
  }

  private setupEvents() {
    this.dAppConnector!.onSessionIframeCreated = async(session: SessionTypes.Struct) => {
      let sessions = this.mapSessions();
      let currentSession = sessions.find((x) => x.topic === session.topic);
      this.selectSession(currentSession!);

      this._eventsObserver.next({
        type: 'session_iframe_created',
        payload: session,
        content: {
          message: 'Session Iframe Created',
          type: 'success'
        }
      });
    }

    this.dAppConnector!.walletConnectClient!.on('session_proposal', (event) => {
      this._eventsObserver.next({
        type: 'session_proposal',
        payload: event,
        content: {
          message: 'Session Proposal',
          type: 'success'
        }
      });
    })

    this.dAppConnector!.walletConnectClient!.on('session_request', (event) => {
      this._eventsObserver.next({
        type: 'session_request',
        payload: event,
        content: {
          message: 'Session Request',
          type: 'success'
        }
      });
    })

    this.dAppConnector!.walletConnectClient!.on('session_event', (event) => {
      this._eventsObserver.next({
        type: 'session_event',
        payload: event,
        content: {
          message: 'Session Event',
          type: 'success'
        }
      });
    })

    this.dAppConnector!.walletConnectClient!.on('session_ping', (event) => {
      this._eventsObserver.next({
        type: 'session_ping',
        payload: event,
        content: {
          message: 'Session Ping',
          type: 'success'
        }
      });
    })

    this.dAppConnector!.walletConnectClient!.on('session_update', (event) => {
      this._eventsObserver.next({
        type: 'session_update',
        payload: event,
        content: {
          message: 'Session Update',
          type: 'success'
        }
      });
    })

    this.dAppConnector!.walletConnectClient!.on('session_delete', (event) => {
      this.clearAuthSession();

      this._eventsObserver.next({
        type: 'session_delete',
        payload: event,
        content: {
          message: 'Session Deleted from WalletConnect',
          type: 'success'
        }
      });
    })

    this.dAppConnector!.walletConnectModal.subscribeModal((event: any) => {
      this._eventsObserver.next({
        type: 'modal',
        payload: event,
        content: {
          message: 'Modal',
          type: 'success'
        }
      });
    })
  }

  private cleanMessagePrefix(message: string, length: number): string {
    return message.replace(this.messagePrefix, '').replace(length.toString(), '')
  }

  async init(): Promise<void> {
    let ledgerId: LedgerId = LedgerId.fromString(environment.ledger);

    this.dAppConnector = new DAppConnector(
      this.metadata,
      ledgerId,
      this.projectId,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [ledgerId.isTestnet() ? HederaChainId.Testnet : HederaChainId.Mainnet]
    )

    console.log(this.dAppConnector);

    await this.dAppConnector.init({ logger: 'error' })
    this.setupEvents();
  }

  private cleanWalletID(walletID: string): string {
    return walletID.replace('hedera:mainnet:', '').replace('hedera:testnet:', '')
  }

  async connectExtension(extensionId: string): Promise<SessionTypes.Struct> {
    try {
      let session: SessionTypes.Struct = await this.dAppConnector!.connectExtension(extensionId);
      let sessions = this.mapSessions();

      if (sessions.filter(s => s.wallet === this.cleanWalletID(<string>lodash.first(session.namespaces['hedera'].accounts))).length > 1) {
        this._eventsObserver.next({
          type: 'session_connect',
          payload: null,
          content: {
            message: 'Wallet already connected',
            type: 'error'
          }
        });

        await this.dAppConnector!.disconnect(session.topic);
        throw new Error('Wallet already connected');
      } else {
        let currentSession = sessions.find((x) => x.topic === session.topic);
        this.selectSession(currentSession!);

        this._eventsObserver.next({
          type: 'session_connect',
          payload: session,
          content: {
            message: 'Connected to WalletConnect Extension',
            type: 'success'
          }
        })

        return session;
      }
    } catch(error) {
      throw new Error('Failed to connect to WalletConnect Extension');
    }
  }

  async connect() {
    try {
      let session: SessionTypes.Struct = await this.dAppConnector!.openModal()
      this._eventsObserver.next({
        type: 'session_connect',
        payload: session,
        content: {
          message: 'Connected to WalletConnect Extension',
          type: 'success'
        }
      })

      let sessions = this.mapSessions();
      let currentSession = sessions.find((x) => x.topic === session.topic);
      this.selectSession(currentSession!);

      return session;
    } catch (error) {
      throw new Error('Failed to connect to WalletConnect')
    }
  }

  async disconnect(topic: string) {
    await this.dAppConnector!.disconnect(topic)
    this.clearAuthSession();

    this._eventsObserver.next({
      type: 'session_disconnect',
      payload: null,
      content: {
        message: 'Disconnected from WalletConnect Extension',
        type: 'success'
      }
    })
  }

  async disconnectAll() {
    await this.dAppConnector!.disconnectAll()

    this._eventsObserver.next({
      type: 'session_disconnect_all',
      payload: null,
      content: {
        message: 'Disconnected from all WalletConnect Extensions',
        type: 'success'
      }
    })
  }

  loadSessions(): Array<SessionTypes.Struct> | undefined {
    // Check if the connector and client are initialized
    if (!this.dAppConnector || !this.dAppConnector.walletConnectClient) {
      LoggerUtil.log('⚠️ WalletConnect client not initialized yet, returning empty sessions');
      return [];
    }
    return this.dAppConnector.walletConnectClient.session.getAll()
  }

  selectSession(session: WC_Session | undefined): void {
    if(!lodash.isUndefined(session)) {
      LoggerUtil.log(`🔍 DEBUG - Selecting wallet session: ${session.wallet} (topic: ${session.topic})`);
      localStorage.setItem('wc_selected_wallet', JSON.stringify(session));

      // Check the session storage state after selection
      this.validateSessionStorage(session.wallet);
    } else {
      LoggerUtil.log(`🔍 DEBUG - Clearing selected wallet session`);
      localStorage.removeItem('wc_selected_wallet');
    }
  }

  /**
   * Validate the session cookie storage for a wallet
   * This helps debug issues with session cookies not being correctly stored/retrieved
   * @param walletId - The wallet ID to validate
   */
  private validateSessionStorage(walletId: string): void {
    LoggerUtil.log(`🔍 DEBUG - Validating session storage for wallet: ${walletId}`);

    // Check if there's a session cookie for this wallet
    const sessionCookie = AxiosService.getSessionCookie(walletId);
    LoggerUtil.log(`🔍 DEBUG - Session cookie for ${walletId}: ${sessionCookie || 'undefined'}`);

    // Log all available sessions and verify localStorage state
    AxiosService.compareStorageWithMemory();

    // If we have a session cookie, we should see it being added to requests
    if (sessionCookie) {
      LoggerUtil.log(`🔍 DEBUG - Found session cookie for wallet ${walletId}, it should be added to requests`);
    } else {
      LoggerUtil.log(`🔍 DEBUG - ⚠️ No session cookie found for wallet ${walletId}, headers may be incomplete`);
      LoggerUtil.log(`🔍 DEBUG - User may need to re-authenticate this wallet to get a session cookie`);
    }
  }

  getSelectedSession(): WC_Session | null {
    LoggerUtil.log(`🔍 DEBUG - Getting selected session`);
    const activeSessions: Array<WC_Session> = this.mapSessions();
    LoggerUtil.log(`🔍 DEBUG - Active sessions:`, activeSessions);

    if (!activeSessions || activeSessions.length === 0) {
      LoggerUtil.log(`🔍 DEBUG - No active sessions available`);
      return null;
    }

    const savedSession = localStorage.getItem('wc_selected_wallet');
    LoggerUtil.log(`🔍 DEBUG - Saved session from localStorage:`, savedSession);

    if (!savedSession) {
      LoggerUtil.log(`🔍 DEBUG - No saved session, returning first active session`);
      return activeSessions[0];
    }

    const latestSelectedSession: WC_Session = JSON.parse(savedSession);
    LoggerUtil.log(`🔍 DEBUG - Latest selected session:`, latestSelectedSession);

    if(activeSessions?.find((session) => session.topic === latestSelectedSession.topic)) {
      LoggerUtil.log(`🔍 DEBUG - Found matching active session, returning it`);
      return latestSelectedSession;
    } else {
      LoggerUtil.log(`🔍 DEBUG - No matching active session, returning first session`);
      return activeSessions[0];
    }
  }

  mapSessions(): Array<WC_Session> {
    let sessions = this.loadSessions();

    if (!sessions || sessions.length === 0) {
      LoggerUtil.log('🔍 mapSessions: No sessions to map');
      return [];
    }

    return <Array<WC_Session>>sessions.map((session) => {
      return {
        topic: session.topic,
        wallet: this.cleanWalletID(<string>lodash.first(session.namespaces['hedera'].accounts)),
        id: <string>lodash.first(session.namespaces['hedera'].accounts),
        alias: session.sessionProperties ? session.sessionProperties['alias'] : null,
        publicKey: session.sessionProperties && session.sessionProperties['publicKey'] ?
          session.sessionProperties!['publicKey'] : session.self.publicKey
      }
    });
  }

  clearAuthSession() {
    const latestSelectedSession: WC_Session = JSON.parse(<string>localStorage.getItem('wc_selected_wallet'));
    localStorage.removeItem(`${latestSelectedSession.topic}.hashconnect.auth`);

    let fallbackSession = lodash.first(this.mapSessions());
    if(fallbackSession) {
      this.selectSession(fallbackSession);
    } else {
      this.selectSession(undefined);
    }
  }

  getAuthSession() {
    let auth = localStorage.getItem(`${this.getSelectedSession()?.topic}.hashconnect.auth`);

    let authResponse = null;
    if (auth) {
        authResponse = JSON.parse(auth);
    }

    return authResponse;
  }

  async hederaExecuteTransaction(
    transactionBytes: Uint8Array,
    walletSignature: string
  ): Promise<ExecuteTransactionResult> {
    const bodyBytes = Buffer.from(<any>transactionBytes, 'base64')
    const sigMap = base64StringToSignatureMap(walletSignature)

    const bytes = proto.Transaction.encode({ bodyBytes, sigMap }).finish()
    const transactionList = transactionToBase64String(Transaction.fromBytes(bytes))

    const params: ExecuteTransactionParams = { transactionList }
    return await this.dAppConnector!.executeTransaction(params)
  }

  async hederaSignMessage(
    session: WC_Session,
    message: string
  ): Promise<{ verified: boolean, signatureMap: any }> {
    try {
    const params: SignMessageParams = {
      signerAccountId: session.wallet,
      message
    }

    console.log('🔍 [WalletConnectService] Signing message:', params);

    const { signatureMap } = <any>await this.dAppConnector!.signMessage(params)
    const accountPublicKey = PublicKey.fromString(session.publicKey)
    const verified = verifyMessageSignature(message, signatureMap, accountPublicKey)

    return {
      verified,
      signatureMap
    }
    } catch (error: any) {
      if (error.code === 9000 && error.message === 'USER_REJECT') {
        this.disconnect(session.topic);

        this._eventsObserver.next({
          type: 'authenticate',
          content: {
            message: `Signature Request Rejected. Connect again to sign the message.`,
            method: 'authenticate',
            type: 'error'
          }
        });

        return { verified: false, signatureMap: null }
      } else {
        LoggerUtil.error('An error occurred while signing the message:', error)
        return { verified: false, signatureMap: null }
      }
    }
  }

  prefixMessageToSign(message: string): string {
    return '\x19Hedera Signed Message:\n' + message.length + message
  }

  async hederaSignAndExecuteTransaction(
    session: WC_Session,
    transaction: Transaction
  ): Promise<SignAndExecuteTransactionResult> {
    const params: SignAndExecuteTransactionParams = {
      transactionList: transactionToBase64String(transaction),
      signerAccountId: session.wallet,
    }

    return await this.dAppConnector!.signAndExecuteTransaction(params)
  }

  async hederaSignTransaction(
    session: WC_Session,
    transaction: Transaction
  ): Promise<{
    transaction: Transaction,
    signature: Uint8Array
  }> {
    const params: SignTransactionParams = {
      signerAccountId: session.wallet,
      transactionBody: transactionBodyToBase64String(
        transactionToTransactionBody(transaction, lodash.first(transaction.nodeAccountIds) as AccountId),
      ),
    }

    const signatureResponse = <any>await this.dAppConnector!.signTransaction(params)
    const decodedSignatureMap = base64StringToSignatureMap(signatureResponse.signatureMap);
    const signature = <Uint8Array> lodash.first(decodedSignatureMap.sigPair)?.ed25519 || <Uint8Array> lodash.first(decodedSignatureMap.sigPair)?.ECDSASecp256k1

    const signatureMap = new SignatureMap();
    signatureMap.addSignature(
      lodash.first(transaction.nodeAccountIds) as AccountId,
      lodash.first((<any>transaction)._transactionIds.list),
      PublicKey.fromString(session.publicKey),
      signature
    );

    transaction.addSignature(PublicKey.fromString(session.publicKey), signatureMap);
    return {
      transaction: transaction,
      signature: signature
    };
  }

  // async transferHBAR(toAddress: AccountId, amount: number, memo?: string) {
  //   const transferHBARTransaction = new TransferTransaction()
  //     .addHbarTransfer(this.getAccountId(), -amount)
  //     .addHbarTransfer(toAddress, amount);

  //   // Add memo if provided
  //   if (memo) {
  //     transferHBARTransaction.setTransactionMemo(memo);
  //   }

  //   const signer = this.getSigner();
  //   await transferHBARTransaction.freezeWithSigner(signer);
  //   const txResult = await transferHBARTransaction.executeWithSigner(signer);
  //   return txResult ? txResult.transactionId : null;
  // }

  /**
   * Get the session ID for API requests
   * @returns The session ID from the selected wallet or 'default'
   */
  get sessionId(): string {
    const session = this.getSelectedSession();
    const walletId = session?.wallet || 'default';
    LoggerUtil.log(`🔍 DEBUG - Session ID requested, returning: ${walletId}`);
    return walletId;
  }

  // HTTP Authentication Methods
  async checkSession(): Promise<any> {
    try {
      const session = this.getSelectedSession();
      if (!session) {
        LoggerUtil.log('No session available to check');
        return null;
      }

      // Use the wallet ID for the request
      const walletId = session.wallet;
      LoggerUtil.log(`Checking session for wallet ${walletId}`);

      const response = await AxiosService.get(walletId, '/auth/profile');

      if (response.data) {
        LoggerUtil.log(`Successfully verified session for ${walletId}`);
        // Make sure our local session is updated
        this.session = session;
      }

      return response.data;
    } catch (error) {
      LoggerUtil.log('Session check failed, no active session');
      return null;
    }
  }

  /**
   * Logs out the user from their current session
   * @param session Optional - The wallet session to log out of. If not provided, the currently selected session will be used.
   * @returns A promise that resolves to true if logout was successful
   */
  async logout(session?: WC_Session): Promise<any> {
    try {
      // If no session is provided, use the currently selected session
      const sessionToUse = session || this.getSelectedSession();
      if (!sessionToUse) {
        LoggerUtil.log('No session available to logout');
        return false;
      }

      const walletId = sessionToUse.wallet;

      // Clear session on backend
      await AxiosService.get(walletId, '/auth/web3/logout');

      // Clear local session data
      AxiosService.clearSession(walletId);

      return true;
    } catch (error) {
      LoggerUtil.error('Logout error:', error);
      return false;
    }
  }

  async getBalance(accountId: string): Promise<any> {
    try {
      // Determine Mirror Node URL based on environment
      const mirrorNodeUrl = this.getMirrorNodeUrl();
      const endpoint = `${mirrorNodeUrl}/api/v1/balances?account.id=${accountId}&order=asc`;

      console.log('🔍 [WalletConnectService] Querying Mirror Node for balance:', endpoint);

      // Make direct fetch request to Hedera Mirror Node (not our backend)
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Mirror Node request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [WalletConnectService] Mirror Node balance response:', data);

      return data;
    } catch (error: any) {
      console.error('❌ [WalletConnectService] Failed to fetch balance from Mirror Node:', error);
      throw new Error(`Failed to fetch wallet balance: ${error.message}`);
    }
  }

  // async getHsuiteBalance(accountId: string): Promise<number | null> {
  //   try {
  //     const session = this.getSelectedSession();
  //     const walletId = session?.wallet || 'default';

  //     // Use the new endpoint pattern
  //     const tokenId = environment.hsuiteTokenId;
  //     const response = await AxiosService.get(
  //       walletId,
  //       `/mirrors/accounts/${accountId}/tokens`,
  //       { params: { 'token.id': tokenId, limit: 1 } }
  //     );

  //     // Check if token is found in the response
  //     if (response.data && response.data.tokens && response.data.tokens.length > 0) {
  //       const tokenInfo = await AxiosService.get(
  //         walletId,
  //         `/mirrors/tokens/${tokenId}`
  //       );

  //       const decimals = tokenInfo.data.decimals;
  //       const balance = response.data.tokens[0].balance;

  //       return balance / Math.pow(10, decimals);
  //     }

  //     // If we reach here, the API returned success but no token was found
  //     // This indicates the token is not associated (otherwise, we'd get token info)
  //     return null; // Return null to indicate token is not associated
  //   } catch (error) {
  //     // Check for 404 errors, which indicate token is not associated
  //     if (error?.response?.status === 404 ||
  //         error?.message?.includes('No token relationships')) {
  //       LoggerUtil.log(`HSUITE token not associated for account ${accountId}`);
  //       return null; // Return null to indicate token is not associated
  //     }

  //     LoggerUtil.error('Error fetching HSUITE balance:', error);
  //     return null; // For any other errors, also return null
  //   }
  // }

  async getTokenInfo(tokenId: string): Promise<any> {
    try {
      const session = this.getSelectedSession();
      const walletId = session?.wallet || 'default';

      const response = await AxiosService.get(walletId, `/mirrors/tokens/${tokenId}`);
      return response.data;
    } catch (error: any) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || 'Failed to fetch token info');
      } else {
        throw new Error('Failed to fetch token info');
      }
    }
  }

  /**
   * Get specific token balance for an account from Hedera Mirror Node API
   * Makes direct request to public Mirror Node endpoint
   * @param accountId - The account ID to check token balance for
   * @param tokenId - The specific token ID to query
   * @returns Promise containing token balance information
   */
  async getTokenBalance(accountId: string, tokenId: string): Promise<any> {
    try {
      // Determine Mirror Node URL based on environment
      const mirrorNodeUrl = this.getMirrorNodeUrl();
      const endpoint = `${mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens?order=desc&token.id=${tokenId}`;

      console.log('🔍 [WalletConnectService] Querying Mirror Node for token balance:', endpoint);

      // Make direct fetch request to Hedera Mirror Node (not our backend)
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Mirror Node request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [WalletConnectService] Mirror Node token balance response:', data);

      // Return the first token if found, otherwise null
      if (data.tokens && data.tokens.length > 0) {
        return data.tokens[0];
      }

      return null; // Token not found or not associated
    } catch (error: any) {
      console.error('❌ [WalletConnectService] Failed to fetch token balance from Mirror Node:', error);
      throw new Error(`Failed to fetch token balance: ${error.message}`);
    }
  }

  /**
   * Get account allowances from Hedera Mirror Node API
   * Makes direct request to public Mirror Node endpoint
   */
  async getAccountAllowances(accountId: string): Promise<any> {
    try {
      // Determine Mirror Node URL based on environment
      const mirrorNodeUrl = this.getMirrorNodeUrl();
      const endpoint = `${mirrorNodeUrl}/api/v1/accounts/${accountId}/allowances/crypto`;

      console.log('🔍 [WalletConnectService] Querying Mirror Node:', endpoint);

      // Make direct fetch request to Hedera Mirror Node (not our backend)
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Mirror Node request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [WalletConnectService] Mirror Node response:', data);

      return data;
    } catch (error: any) {
      console.error('❌ [WalletConnectService] Failed to fetch account allowances from Mirror Node:', error);
      throw new Error(`Failed to fetch account allowances: ${error.message}`);
    }
  }

  /**
   * Get the appropriate Mirror Node URL based on environment
   */
  private getMirrorNodeUrl(): string {
    // You can adjust this based on your environment configuration
    const ledger = environment.ledger?.toLowerCase() || 'testnet';

    switch (ledger) {
      case 'mainnet':
        return 'https://mainnet-public.mirrornode.hedera.com';
      case 'testnet':
        return 'https://testnet.mirrornode.hedera.com';
      case 'previewnet':
        return 'https://previewnet.mirrornode.hedera.com';
      default:
        // Default to testnet if unknown
        console.warn('⚠️ [WalletConnectService] Unknown ledger, defaulting to testnet Mirror Node');
        return 'https://testnet.mirrornode.hedera.com';
    }
  }

  getSession(): any {
    return this.session;
  }

  //This endpoint will return a payload to be signed offline with your web3 wallet. The signed payload will then be sent to the login endpoint to authenticate the user.
  async requestAuthChallenge(): Promise<any> {
    try {
      const session = this.getSelectedSession();
      const walletId = session?.wallet || 'default';

      const response = await AxiosService.get(walletId, '/auth/web3/request');
      return response.data;
    } catch (error) {
      throw new Error('Failed to request authentication challenge');
    }
  }

  /**
   * Login with a signed payload to authenticate with the server
   * @param signedData - The signed authentication data
   * @param session - The wallet session to use for authentication
   * @returns The authentication response data
   */
  async login(signedData: any, session: WC_Session): Promise<any> {
    try {
      // Use wallet ID as the session ID
      const walletId = session.wallet;
      LoggerUtil.log(`🔍 DEBUG - Attempting login for wallet ${walletId}`);

      // Check if we already have a session cookie for this wallet
      const existingCookie = AxiosService.getSessionCookie(walletId);
      if (existingCookie) {
        LoggerUtil.log(`🔍 DEBUG - Wallet ${walletId} already has session cookie: ${existingCookie}`);
      }

      // Make sure we're using the right wallet session
      this.selectSession(session);

      // Perform login request with this wallet ID
      const response = await AxiosService.post(
        walletId,
        '/auth/web3/login',
        {
          signedData,
          operator: {
            accountId: session.wallet,
            publicKey: session.publicKey
          }
        }
      );

      LoggerUtil.log(`🔍 DEBUG - Login successful for wallet ${walletId}`);

      // Save the session cookie if it's returned from the backend
      if (response.data && response.data.cookieName) {
        LoggerUtil.log(`🔍 DEBUG - Received cookie name for wallet ${walletId}: ${response.data.cookieName}`);

        // Store the cookie in our session map
        AxiosService.setSessionCookie(walletId, response.data.cookieName);

        // Debug session storage state
        AxiosService.compareStorageWithMemory();
      } else {
        LoggerUtil.log(`🔍 DEBUG - ⚠️ No cookie name returned from backend for wallet ${walletId}`);
      }

      // Test profile request to verify the session works
      try {
        LoggerUtil.log(`🔍 DEBUG - Testing profile request for wallet ${walletId}`);
        const profileResponse = await AxiosService.get(walletId, '/auth/profile');
        LoggerUtil.log(`🔍 DEBUG - Profile request successful for wallet ${walletId}`);

        // Check if the profile request included the session cookie header
        LoggerUtil.log(`🔍 DEBUG - Cookie header should have been included: ${AxiosService.getSessionCookie(walletId)}`);
      } catch (profileError) {
        LoggerUtil.error(`🔍 DEBUG - Profile request failed for wallet ${walletId}:`, profileError);
      }

      // Save the session ID in localStorage to identify which instance is active
      localStorage.setItem(`auth_session_${session.topic}`, walletId);

      return response.data;
    } catch (error) {
      LoggerUtil.error('🔍 DEBUG - Login error:', error);
      throw new Error('Failed to login');
    }
  }

  /**
   * Associates a token to the connected wallet account
   * @param tokenId The ID of the token to associate
   * @returns A promise that resolves to the transaction result
   */
  async associateToken(tokenId: string): Promise<SignAndExecuteTransactionResult> {
    try {
      const session = this.getSelectedSession();
      if (!session) {
        throw new Error('No active wallet session');
      }

      // Check if token is already associated
      try {
        const tokenInfo = await this.getTokenInfo(tokenId);
        // If we get here, token is already associated
        throw new Error('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT');
      } catch (error: any) {
        // Only proceed if error is due to token not being associated
        if (!error.message?.includes('No token relationships') &&
            !error.message?.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) {
          throw error;
        }
      }

      // Create token associate transaction
      const transaction = new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(session.wallet))
        .setTokenIds([TokenId.fromString(tokenId)])

      transaction.freezeWithSigner(this.signer);

      // Sign and execute transaction using WalletConnect
      return await this.hederaSignAndExecuteTransaction(session, transaction);
    } catch (error: any) {
      // Handle common errors
      if (error.message?.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT') ||
          error.message?.includes('already associated')) {
        LoggerUtil.log('Token is already associated to account');
        // Return a successful result for better UX
        return { transactionId: 'already-associated' } as unknown as SignAndExecuteTransactionResult;
      } else if (error.code === 9000 && error.message === 'USER_REJECT') {
        LoggerUtil.error('User rejected the token association transaction');
        throw new Error('USER_REJECT');
      }

      LoggerUtil.error('Token association error:', error);
      throw new Error('Failed to associate token: ' + (error.message || error));
    }
  }
}
