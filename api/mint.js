// api/mint.js
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum } from 'viem/chains';
import { abi } from '../abi.js'; // put your contract ABI here

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
    const { address, tokenId, quantity = 1 } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'No address provided' });
    }
    if (tokenId === undefined) {
      return res.status(400).json({ error: 'No tokenId provided' });
    }

    // Load keys from env
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const ALCHEMY_KEY = process.env.ALCHEMY_KEY;

    const account = privateKeyToAccount(PRIVATE_KEY);

    const client = createWalletClient({
      account,
      chain: arbitrum,
      transport: http(`https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`)
    });

    const txHash = await client.writeContract({
      address: '0x717731d5bfc67c105ac723FE461FcdC808930fB1', // your contract
      abi,
      functionName: 'claim',
      args: [
        address,                         // recipient
        BigInt(tokenId),                 // tokenId (dynamic)
        BigInt(quantity),                // quantity (default = 1)
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // currency (native ETH)
        0n,                              // price
        {
          proof: [],
          quantityLimitPerWallet: 100n,
          pricePerToken: 0n,
          currency: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        },
        '0x'
      ]
    });

    res.status(200).json({ success: true, txHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
