// api/mint.js
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { abi } from '../abi.js'; // using your uploaded ABI

export default async function handler(req, res) {
  // --- CORS HEADERS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // --- END CORS HEADERS ---
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  try {
    const { address, quantity = 1 } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'No address provided' });
    }

    const PRIVATE_KEY = process.env.PRIVATE_KEY; // wallet to send from
    const ALCHEMY_KEY = process.env.ALCHEMY_KEY; // your Alchemy key

    const account = privateKeyToAccount(PRIVATE_KEY);

    const client = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(`https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`)
    });

    // Claim parameters for the contract
    const _receiver = address;
    const _tokenId = 0n; // Token ID is 0
    const _quantity = BigInt(quantity);
    const _currency = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // Native ETH (special address)
    const _pricePerToken = parseEther('0.00001'); // 0.00001 ETH per token
    
    // Empty allowlist proof for public mint
    const _allowlistProof = {
      proof: [], // empty array for public mint
      quantityLimitPerWallet: 0n, // 0 means no limit or use default
      pricePerToken: parseEther('0.00001'), // must match _pricePerToken above
      currency: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' // must match _currency above
    };
    
    const _data = '0x'; // empty bytes

    // Calculate total value needed (price per token * quantity)
    const totalValue = _pricePerToken * _quantity;

    const txHash = await client.writeContract({
      address: '0xFFCBFf3f51e0093F282A7e830d9D792288C4A3B1', // NFT contract on Arbitrum Sepolia
      abi,
      functionName: 'claim',
      args: [
        _receiver,
        _tokenId,
        _quantity,
        _currency,
        _pricePerToken,
        _allowlistProof,
        _data
      ],
      value: totalValue // Send the required ETH amount
    });

    res.status(200).json({ success: true, txHash });
  } catch (err) {
    console.error('Minting error:', err);
    res.status(500).json({ error: err.message });
  }
}
