// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract WydaPatreonEscrow {
    IERC20 public immutable wyda;
    uint256 public constant PERIOD = 30 days;

    struct Tier {
        string name;
        uint128 monthlyAmount;
        string perks;
        bool active;
    }

    struct Sponsorship {
        uint32 tierId;
        uint64 lastPaidAt;
        uint128 monthlyAmount;
        uint128 escrowed;
        bool active;
    }

    mapping(address => Tier[]) private _tiers;
    mapping(address sponsor => mapping(address creator => Sponsorship)) public sponsorship;
    mapping(address creator => address[]) public creatorSponsors;
    mapping(address creator => mapping(address sponsor => bool)) public isCreatorSponsor;

    event TierAdded(address indexed creator, uint256 indexed tierId, uint256 monthlyAmount);
    event TierEdited(address indexed creator, uint256 indexed tierId, uint256 monthlyAmount, bool active);
    event Sponsored(address indexed sponsor, address indexed creator, uint256 tierId, uint256 amount);
    event SponsorshipCanceled(address indexed sponsor, address indexed creator);
    event CreatorWithdrawal(address indexed creator, uint256 amount);

    error InvalidTier();
    error TierInactive();
    error InvalidAmount();
    error NothingToWithdraw();
    error NotActive();

    constructor(address wydaToken) {
        wyda = IERC20(wydaToken);
    }

    function addTier(string calldata name, uint256 monthlyAmount, string calldata perks) external {
        if (monthlyAmount == 0 || monthlyAmount > type(uint128).max) revert InvalidAmount();

        _tiers[msg.sender].push(
            Tier({name: name, monthlyAmount: uint128(monthlyAmount), perks: perks, active: true})
        );

        emit TierAdded(msg.sender, _tiers[msg.sender].length - 1, monthlyAmount);
    }

    function editTier(
        uint256 tierId,
        string calldata name,
        uint256 monthlyAmount,
        string calldata perks,
        bool active
    ) external {
        if (tierId >= _tiers[msg.sender].length) revert InvalidTier();
        if (monthlyAmount == 0 || monthlyAmount > type(uint128).max) revert InvalidAmount();

        Tier storage tier = _tiers[msg.sender][tierId];
        tier.name = name;
        tier.monthlyAmount = uint128(monthlyAmount);
        tier.perks = perks;
        tier.active = active;

        emit TierEdited(msg.sender, tierId, monthlyAmount, active);
    }

    function sponsor(address creator, uint256 tierId) external {
        if (tierId >= _tiers[creator].length) revert InvalidTier();

        Tier memory tier = _tiers[creator][tierId];
        if (!tier.active) revert TierInactive();

        Sponsorship storage s = sponsorship[msg.sender][creator];

        if (!s.active && s.escrowed == 0) {
            s.lastPaidAt = uint64(block.timestamp);
        }

        s.active = true;
        s.tierId = uint32(tierId);
        s.monthlyAmount = tier.monthlyAmount;
        s.escrowed += tier.monthlyAmount;

        if (!isCreatorSponsor[creator][msg.sender]) {
            isCreatorSponsor[creator][msg.sender] = true;
            creatorSponsors[creator].push(msg.sender);
        }

        require(wyda.transferFrom(msg.sender, address(this), tier.monthlyAmount), "TRANSFER_FROM_FAILED");
        emit Sponsored(msg.sender, creator, tierId, tier.monthlyAmount);
    }

    function cancelSponsorship(address creator) external {
        Sponsorship storage s = sponsorship[msg.sender][creator];
        if (!s.active) revert NotActive();
        s.active = false;
        emit SponsorshipCanceled(msg.sender, creator);
    }

    function creatorWithdraw(uint256 maxSponsors) external {
        if (maxSponsors == 0) revert InvalidAmount();

        uint256 releasable = _settleCreator(msg.sender, maxSponsors);
        if (releasable == 0) revert NothingToWithdraw();

        require(wyda.transfer(msg.sender, releasable), "TRANSFER_FAILED");
        emit CreatorWithdrawal(msg.sender, releasable);
    }

    function pendingWithdraw(address creator) external view returns (uint256 total) {
        address[] memory sponsors = creatorSponsors[creator];
        uint256 sponsorLength = sponsors.length;

        for (uint256 i = 0; i < sponsorLength; i++) {
            Sponsorship memory s = sponsorship[sponsors[i]][creator];
            if (s.escrowed == 0 || s.monthlyAmount == 0) continue;

            uint256 periodsPassed = (block.timestamp - s.lastPaidAt) / PERIOD;
            uint256 escrowPeriods = s.escrowed / s.monthlyAmount;
            uint256 unlockedPeriods = periodsPassed < escrowPeriods ? periodsPassed : escrowPeriods;
            total += unlockedPeriods * s.monthlyAmount;
        }
    }

    function tierCount(address creator) external view returns (uint256) {
        return _tiers[creator].length;
    }

    function getTier(address creator, uint256 tierId) external view returns (Tier memory) {
        if (tierId >= _tiers[creator].length) revert InvalidTier();
        return _tiers[creator][tierId];
    }

    function _settleCreator(address creator, uint256 maxSponsors) internal returns (uint256 total) {
        address[] memory sponsors = creatorSponsors[creator];
        uint256 sponsorLength = sponsors.length;
        if (maxSponsors < sponsorLength) {
            sponsorLength = maxSponsors;
        }

        for (uint256 i = 0; i < sponsorLength; i++) {
            Sponsorship storage s = sponsorship[sponsors[i]][creator];
            if (s.escrowed == 0 || s.monthlyAmount == 0) continue;

            uint256 periodsPassed = (block.timestamp - s.lastPaidAt) / PERIOD;
            if (periodsPassed == 0) continue;

            uint256 escrowPeriods = s.escrowed / s.monthlyAmount;
            uint256 releasablePeriods = periodsPassed < escrowPeriods ? periodsPassed : escrowPeriods;
            if (releasablePeriods == 0) continue;

            uint256 amount = releasablePeriods * s.monthlyAmount;
            s.escrowed -= uint128(amount);
            s.lastPaidAt += uint64(releasablePeriods * PERIOD);
            total += amount;
        }
    }
}
