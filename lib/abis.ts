export const wydaEscrowAbi = [
  "function addTier(string calldata name, uint256 monthlyAmount, string calldata perks) external",
  "function editTier(uint256 tierId, string calldata name, uint256 monthlyAmount, string calldata perks, bool active) external",
  "function sponsor(address creator, uint256 tierId) external",
  "function cancelSponsorship(address creator) external",
  "function creatorWithdraw(uint256 maxSponsors) external",
  "function tierCount(address creator) external view returns (uint256)",
  "function getTier(address creator, uint256 tierId) external view returns (string memory name, uint256 monthlyAmount, string memory perks, bool active)",
  "function sponsorship(address sponsorAddress, address creator) external view returns (uint32 tierId, uint64 lastPaidAt, uint128 monthlyAmount, uint128 escrowed, bool active)",
  "function pendingWithdraw(address creator) external view returns (uint256)",
  "event Sponsored(address indexed sponsor, address indexed creator, uint256 tierId, uint256 amount)",
  "event CreatorWithdrawal(address indexed creator, uint256 amount)",
];
