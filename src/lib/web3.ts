import { BrowserProvider, Contract, parseUnits } from 'ethers';

export const WYDA_TOKEN_ADDRESS = '0xD84B7E8b295d9Fa9656527AC33Bf4F683aE7d2C4';
// This would be the deployed address of the WydaEscrow contract
export const ESCROW_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; 

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

export const ESCROW_ABI = [
  'function subscribe(address _creator, uint256 _monthlyRate, uint256 _totalAmount) external',
  'function creatorWithdraw(address _supporter) external',
  'function cancelSubscription(address _creator) external',
  'function subscriptions(address creator, address supporter) view returns (uint256 amountPerMonth, uint256 totalDeposited, uint256 startTime, uint256 lastWithdrawTime, bool active)',
];

export async function getWeb3Provider() {
  if (typeof window.ethereum !== 'undefined') {
    const provider = new BrowserProvider(window.ethereum);
    return provider;
  }
  throw new Error('MetaMask is not installed');
}

export async function connectWallet() {
  const provider = await getWeb3Provider();
  const accounts = await provider.send('eth_requestAccounts', []);
  return accounts[0];
}

export function getWydaContract(signerOrProvider: any) {
  return new Contract(WYDA_TOKEN_ADDRESS, ERC20_ABI, signerOrProvider);
}

export function getEscrowContract(signerOrProvider: any) {
  return new Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signerOrProvider);
}
