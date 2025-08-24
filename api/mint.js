// api/randomPicker.js
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// RandomPicker contract ABI
const randomPickerABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "_totalItems", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "pickedNumber", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "totalItems", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "NumberPicked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "pickRandomNumber",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_newTotal", "type": "uint256"}],
    "name": "setTotalItems",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLastPicked",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalPicks",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalItems",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "lastPickedNumber",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pickCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export default async function handler(req, res) {

  // --- CORS HEADERS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // --- END CORS HEADERS ---

  
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Only POST and GET requests allowed' });
  }

  try {
    // Load keys from env
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org'; // Base Sepolia RPC

    const account = privateKeyToAccount(PRIVATE_KEY);

    // Your RandomPicker contract address
    const CONTRACT_ADDRESS = '0xf2cdb7b3dc874eb2da9c25e9aefe42b2260ffefc';

    // Handle GET requests - Read contract state
    if (req.method === 'GET') {
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URL)
      });

      const [totalItems, lastPickedNumber, pickCount] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: randomPickerABI,
          functionName: 'totalItems'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: randomPickerABI,
          functionName: 'lastPickedNumber'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: randomPickerABI,
          functionName: 'pickCount'
        })
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalItems: totalItems.toString(),
          lastPickedNumber: lastPickedNumber.toString(),
          pickCount: pickCount.toString()
        }
      });
    }

    // Handle POST requests - Pick random number or set total items
    const { action, newTotal } = req.body;

    const client = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(RPC_URL)
    });

    let txHash;
    let result;

    if (action === 'pickRandom') {
      // Pick a random number
      txHash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: randomPickerABI,
        functionName: 'pickRandomNumber'
      });

      // Wait for transaction and get the picked number
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URL)
      });

      // Wait a bit for the transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 2000));

      const pickedNumber = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: randomPickerABI,
        functionName: 'getLastPicked'
      });

      result = {
        action: 'pickRandom',
        txHash,
        pickedNumber: pickedNumber.toString()
      };

    } else if (action === 'setTotal' && newTotal) {
      // Set new total items
      if (isNaN(newTotal) || newTotal <= 0) {
        return res.status(400).json({ error: 'Invalid newTotal value' });
      }

      txHash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: randomPickerABI,
        functionName: 'setTotalItems',
        args: [BigInt(newTotal)]
      });

      result = {
        action: 'setTotal',
        txHash,
        newTotal: newTotal.toString()
      };

    } else {
      return res.status(400).json({ 
        error: 'Invalid action. Use "pickRandom" or "setTotal" with newTotal parameter' 
      });
    }

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
