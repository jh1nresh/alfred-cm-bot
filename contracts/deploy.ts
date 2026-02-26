import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Deploy CMTreasury to Base Sepolia
// Uses env: PRIVATE_KEY, BASE_SEPOLIA_RPC

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const DEFAULT_PAYOUT = 100000; // 0.10 USDC (6 decimals)

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  console.log('Deploying CMTreasury to Base Sepolia...');
  console.log(`RPC: ${rpcUrl}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Deployer address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  // Read compiled contract (assumes Hardhat or Foundry compilation)
  // This is a placeholder - actual deployment needs compiled artifacts
  const artifactPath = path.join(__dirname, '../artifacts/contracts/CMTreasury.sol/CMTreasury.json');

  if (!fs.existsSync(artifactPath)) {
    console.error('Contract artifact not found. Please compile first:');
    console.error('  npx hardhat compile');
    console.error('  OR');
    console.error('  forge build');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  console.log('Deploying contract...');

  const contract = await factory.deploy(
    USDC_BASE_SEPOLIA,
    wallet.address, // Bot address is deployer for now
    DEFAULT_PAYOUT
  );

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`CMTreasury deployed to: ${contractAddress}`);
  console.log('');
  console.log('Add to your .env:');
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
