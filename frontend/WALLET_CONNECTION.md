# Wallet Connection Guide

## Overview
Ecosphere supports wallet-based authentication using Hedera-compatible wallets. This guide will help you connect your wallet and troubleshoot common issues.

## Supported Wallets

### 1. Kabila Wallet
- **Type**: Browser Extension
- **Download**: [Chrome Web Store](https://chrome.google.com/webstore)
- **Features**: Native Hedera support, HCS messaging, NFT management
- **Best For**: Advanced users, developers

### 2. HashPack Wallet  
- **Type**: Browser Extension
- **Download**: [hashpack.app](https://www.hashpack.app/)
- **Features**: User-friendly interface, multi-account support, dApp integration
- **Best For**: General users, NFT collectors

### 3. WalletConnect
- **Type**: Universal Protocol
- **Supported Apps**: Mobile wallets with WalletConnect support
- **Features**: QR code connection, multi-platform support
- **Best For**: Mobile users

## How to Connect

### Step 1: Install a Wallet
1. Choose a supported wallet from the list above
2. Install the browser extension or mobile app
3. Create a new wallet or import existing one
4. Backup your seed phrase securely

### Step 2: Connect to Ecosphere
1. Visit the Ecosphere login page
2. Click "Connect Wallet" button
3. Select your wallet from the modal
4. Approve the connection in your wallet

### Step 3: Sign Authentication Message
1. Your wallet will prompt you to sign a message
2. Review the message details
3. Click "Sign" in your wallet
4. Wait for authentication to complete

### Step 4: Access Dashboard
Once authenticated, you'll be redirected to the dashboard with full access to:
- Geo Medallion NFT marketplace
- Device management
- Data visualization
- Reward tracking

## Troubleshooting

### Connection Failed

**Problem**: Wallet connection fails or times out

**Solutions**:
1. Ensure your wallet extension is unlocked
2. Check that you're on the correct network (testnet/mainnet)
3. Refresh the page and try again
4. Clear browser cache and cookies
5. Try a different wallet

### Signature Verification Failed

**Problem**: Authentication message signature rejected

**Solutions**:
1. Ensure you signed the correct message
2. Check wallet account has sufficient balance for transactions
3. Verify wallet is connected to correct network
4. Try disconnecting and reconnecting

### Network Mismatch

**Problem**: Wallet network doesn't match Ecosphere network

**Solutions**:
1. Check Ecosphere environment (testnet vs mainnet)
2. Switch wallet network to match:
   - Development: Hedera Testnet
   - Production: Hedera Mainnet
3. Reconnect after network change

### Wallet Not Detected

**Problem**: Extension wallet not showing in options

**Solutions**:
1. Ensure extension is installed and enabled
2. Refresh the browser page
3. Try a different browser
4. Update extension to latest version
5. Check extension permissions

### Session Expired

**Problem**: Session disconnects unexpectedly

**Solutions**:
1. Sessions expire after 24 hours for security
2. Simply reconnect your wallet
3. Enable "Remember me" if available
4. Check wallet extension auto-lock settings

## Security Best Practices

### Wallet Security
- ✅ **Never share** your seed phrase or private keys
- ✅ **Enable** wallet password/PIN protection
- ✅ **Backup** seed phrase in secure location (offline)
- ✅ **Update** wallet software regularly
- ✅ **Use** hardware wallet for large holdings
- ❌ **Don't** install unverified wallet extensions
- ❌ **Don't** connect to unknown dApps
- ❌ **Don't** sign suspicious transactions

### Connection Security
- ✅ Verify URL is correct (ecosphereprime.com)
- ✅ Check for HTTPS/SSL certificate
- ✅ Review all signature requests carefully
- ✅ Disconnect wallet when not in use
- ❌ Don't connect on public WiFi without VPN
- ❌ Don't share session cookies/tokens

### Transaction Security
- ✅ Always review transaction details before signing
- ✅ Verify recipient addresses
- ✅ Check network fees
- ✅ Start with small test transactions
- ❌ Don't rush through signature prompts
- ❌ Don't approve unlimited token allowances

## FAQ

### Q: Do I need HBAR to use Ecosphere?
**A**: Yes, small amounts of HBAR are needed for:
- NFT purchases (Geo Medallions)
- Transaction fees
- Device registration

Free testnet HBAR available at [portal.hedera.com](https://portal.hedera.com)

### Q: Can I use multiple wallets?
**A**: Yes, you can connect different wallets, but only one can be active at a time. Use the user menu to switch wallets.

### Q: What happens if I lose my wallet?
**A**: Your Geo Medallions and devices are tied to your wallet address. If you lose access:
- You can restore wallet using seed phrase
- Contact support if device recovery needed
- NFTs remain on Hedera ledger

### Q: Can I disconnect my wallet?
**A**: Yes, click your wallet address in the navigation and select "Logout". This disconnects your wallet and clears the session.

### Q: Why do I need to sign messages?
**A**: Message signing proves you own the wallet address without revealing private keys. This is the secure authentication method for Web3 applications.

### Q: Is my data safe?
**A**: Yes:
- All transactions are on-chain (Hedera)
- Private keys never leave your wallet
- Ecosphere doesn't store your private keys
- All communication is encrypted (HTTPS)

## Support

### Need Help?
- **Documentation**: [docs.ecosphereprime.com](https://docs.ecosphereprime.com)
- **Discord**: [Join our community](https://discord.gg/ecosphere)
- **Email**: support@ecosphereprime.com
- **GitHub**: [Report issues](https://github.com/ecosphere/planetary-neural-network)

### Common Resources
- [Hedera Documentation](https://docs.hedera.com)
- [Kabila Wallet Guide](https://kabila.app/docs)
- [HashPack Support](https://www.hashpack.app/support)
- [WalletConnect Docs](https://docs.walletconnect.com)

---

**Last Updated**: November 2025  
**Version**: 1.0

