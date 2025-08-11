// api/mint.js
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { abi } from '../abi.js'; // using your uploaded ABI

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  try {
    const { address } = req.body;
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

    const txHash = await client.writeContract({
      address: '0xFFCBFf3f51e0093F282A7e830d9D792288C4A3B1', // NFT contract on Arbitrum Sepolia
      abi,
      functionName: 'claim', // if the contract uses a different name, change here
      args: [address, 1n], // update args to match the mint function signature
    });

    res.status(200).json({ success: true, txHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
