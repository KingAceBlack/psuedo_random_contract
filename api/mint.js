// api/mint.js
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum } from 'viem/chains';
import { abi } from '../abi.js'; // put your contract ABI here

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'No address provided' });
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
      address: '0x5E3e89838E344e64F783f532d289f4bB2B520459', // your contract
      abi,
      functionName: 'claim',
      args: [
        address, // recipient
        0n, // tokenId
        1n, // quantity
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        0n, // price
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
