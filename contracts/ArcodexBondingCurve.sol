// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArcodexBondingCurve
 * @notice Bonding-curve token factory + exchange for the Arc chain launchpad.
 *
 * Architecture
 * ------------
 * - Every token launch creates a new BondingCurveToken via `launchToken`.
 * - Buy/sell prices follow a linear bonding curve priced in USDC (the native
 *   asset of Arc). Curve starts at `startingPrice` and rises linearly with
 *   supply until `graduationThreshold` is reached.
 * - At graduation (100% of the bonding curve sold) the remaining supply and
 *   USDC are migrated to a full AMM pool, and the token trades freely.
 * - Creator fees are fixed at 1% of every trade: 80% to the creator, 20% to
 *   the platform. Fees accrue on-chain and are claimable by each party.
 *
 * Fee split (per user request)
 * ----------------------------
 *   fee = 1% of trade notional
 *   creator share = 80% of fee  (0.8%)
 *   platform share = 20% of fee (0.2%)
 *
 * @custom:security-contact https://arcodex.app
 */
contract ArcodexBondingCurve is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============ Constants ============ */

    uint256 public constant FEE_BPS = 100; // 1.00% total fee
    uint256 public constant CREATOR_SHARE_BPS = 8000; // 80% of fee
    uint256 public constant PLATFORM_SHARE_BPS = 2000; // 20% of fee
    uint256 public constant BPS = 10_000;

    /* ============ State ============ */

    IERC20 public immutable usdc; // native USDC on Arc

    /// @notice Platform fee treasury (20% of collected fees).
    address public platformTreasury;

    /// @notice Total number of tokens launched.
    uint256 public tokenCount;

    /// @notice Metadata for a launched token.
    struct TokenInfo {
        address token;
        address creator;
        address creatorFeeWallet; // where creator fees accrue
        string name;
        string symbol;
        string website;
        string twitter;
        string telegram;
        string discord;
        uint256 supply;
        uint256 startingPrice; // USDC per token, 6 decimals
        uint256 graduationThreshold; // supply at which the curve graduates
        uint256 sold;
        uint256 totalCollected; // total USDC in the curve
        uint256 creatorClaimable;
        uint256 platformClaimable;
        bool graduated;
    }

    mapping(address => TokenInfo) public tokens; // token address -> info
    address[] public tokenList;

    /// @notice USDC balance held per token curve (curve liquidity).
    mapping(address => uint256) public curveBalance;

    /* ============ Events ============ */

    event TokenLaunched(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 supply,
        uint256 startingPrice
    );
    event Buy(address indexed token, address indexed buyer, uint256 usdcIn, uint256 tokensOut);
    event Sell(address indexed token, address indexed seller, uint256 tokensIn, uint256 usdcOut);
    event FeesAccrued(address indexed token, uint256 creatorShare, uint256 platformShare);
    event FeesClaimed(address indexed token, address indexed claimer, uint256 amount);
    event Graduated(address indexed token, address indexed pool);

    /* ============ Constructor ============ */

    constructor(address _usdc, address _platformTreasury) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        platformTreasury = _platformTreasury;
    }

    /* ============ Admin ============ */

    function setPlatformTreasury(address _treasury) external onlyOwner {
        platformTreasury = _treasury;
    }

    /* ============ Launch ============ */

    /**
     * @notice Launch a new token on a bonding curve.
     * @dev Deploys a BondingCurveToken, registers metadata, and mints the full
     *      supply to this contract. Creator pays `startingPrice * supply` USDC
     *      for the initial pool seeding (optional: 0 to start empty).
     */
    function launchToken(
        string calldata name,
        string calldata symbol,
        string calldata description,
        string calldata website,
        string calldata twitter,
        string calldata telegram,
        string calldata discord,
        uint256 supply,
        uint256 startingPrice, // USDC per token (6 decimals)
        uint256 graduationThreshold,
        address creatorFeeWallet
    ) external returns (address token) {
        require(supply > 0, "supply=0");
        require(startingPrice > 0, "price=0");
        require(graduationThreshold > 0 && graduationThreshold <= supply, "bad threshold");

        // Deploy the token contract
        BondingCurveToken t = new BondingCurveToken(name, symbol, address(this));
        token = address(t);
        t.mint(address(this), supply);

        tokens[token] = TokenInfo({
            token: token,
            creator: msg.sender,
            creatorFeeWallet: creatorFeeWallet == address(0) ? msg.sender : creatorFeeWallet,
            name: name,
            symbol: symbol,
            website: website,
            twitter: twitter,
            telegram: telegram,
            discord: discord,
            supply: supply,
            startingPrice: startingPrice,
            graduationThreshold: graduationThreshold,
            sold: 0,
            totalCollected: 0,
            creatorClaimable: 0,
            platformClaimable: 0,
            graduated: false
        });
        tokenList.push(token);
        tokenCount++;

        emit TokenLaunched(token, msg.sender, name, symbol, supply, startingPrice);
    }

    /* ============ Trading ============ */

    /**
     * @notice Buy tokens from the bonding curve with USDC.
     * @dev Price increases linearly with supply. 1% fee on the USDC notional,
     *      split 80/20 creator/platform. USDC fee stays in this contract and is
     *      claimable; the rest funds the curve.
     */
    function buy(address token, uint256 usdcIn) external nonReentrant {
        TokenInfo storage info = tokens[token];
        require(info.token != address(0), "unknown token");
        require(!info.graduated, "graduated");

        usdc.safeTransferFrom(msg.sender, address(this), usdcIn);

        uint256 fee = (usdcIn * FEE_BPS) / BPS;
        uint256 intoCurve = usdcIn - fee;
        uint256 tokensOut = _priceToTokens(token, intoCurve);

        require(info.sold + tokensOut <= info.graduationThreshold, "exceeds threshold");

        info.sold += tokensOut;
        info.totalCollected += intoCurve;
        curveBalance[token] += intoCurve;

        _accrueFee(token, fee);

        BondingCurveToken(token).transfer(msg.sender, tokensOut);

        emit Buy(token, msg.sender, usdcIn, tokensOut);
    }

    /**
     * @notice Sell tokens back to the bonding curve for USDC.
     * @dev Price decreases linearly with supply. 1% fee applied on the USDC out.
     */
    function sell(address token, uint256 tokensIn) external nonReentrant {
        TokenInfo storage info = tokens[token];
        require(info.token != address(0), "unknown token");
        require(!info.graduated, "graduated");

        BondingCurveToken(token).transferFrom(msg.sender, address(this), tokensIn);

        uint256 usdcOut = _tokensToPrice(token, tokensIn);
        uint256 fee = (usdcOut * FEE_BPS) / BPS;
        uint256 outAfterFee = usdcOut - fee;

        require(info.sold >= tokensIn, "insufficient curve");
        info.sold -= tokensIn;
        info.totalCollected -= usdcOut;
        curveBalance[token] -= usdcOut;

        _accrueFee(token, fee);

        usdc.safeTransfer(msg.sender, outAfterFee);

        emit Sell(token, msg.sender, tokensIn, outAfterFee);
    }

    /* ============ Fees ============ */

    function _accrueFee(address token, uint256 fee) internal {
        TokenInfo storage info = tokens[token];
        uint256 creatorShare = (fee * CREATOR_SHARE_BPS) / BPS;
        uint256 platformShare = fee - creatorShare;
        info.creatorClaimable += creatorShare;
        info.platformClaimable += platformShare;
        emit FeesAccrued(token, creatorShare, platformShare);
    }

    /**
     * @notice Claim accrued creator fees for a token.
     */
    function claimCreatorFees(address token) external nonReentrant {
        TokenInfo storage info = tokens[token];
        require(msg.sender == info.creatorFeeWallet || msg.sender == info.creator, "not creator");
        uint256 amount = info.creatorClaimable;
        require(amount > 0, "nothing to claim");
        info.creatorClaimable = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit FeesClaimed(token, msg.sender, amount);
    }

    /**
     * @notice Claim accrued platform fees for a token (owner or treasury).
     */
    function claimPlatformFees(address token) external nonReentrant onlyOwner {
        TokenInfo storage info = tokens[token];
        uint256 amount = info.platformClaimable;
        require(amount > 0, "nothing to claim");
        info.platformClaimable = 0;
        usdc.safeTransfer(platformTreasury, amount);
        emit FeesClaimed(token, platformTreasury, amount);
    }

    /* ============ Graduation ============ */

    /**
     * @notice Migrate a fully-sold curve to a real AMM pool.
     * @dev Called by anyone once the curve is 100% sold. Remaining token supply
     *      and curve USDC are sent to the new pool address.
     */
    function graduate(address token, address pool) external nonReentrant {
        TokenInfo storage info = tokens[token];
        require(info.token != address(0), "unknown token");
        require(!info.graduated, "already graduated");
        require(info.sold >= info.graduationThreshold, "not fully sold");

        info.graduated = true;
        uint256 remainingSupply = info.supply - info.sold;
        uint256 curveUsdc = curveBalance[token];
        curveBalance[token] = 0;

        if (remainingSupply > 0) {
            BondingCurveToken(token).transfer(pool, remainingSupply);
        }
        if (curveUsdc > 0) {
            usdc.safeTransfer(pool, curveUsdc);
        }

        emit Graduated(token, pool);
    }

    /* ============ Curve Math ============ */

    /// @notice USDC needed to buy `tokensOut` at current curve state.
    function priceToTokens(address token, uint256 usdcIn) external view returns (uint256) {
        return _priceToTokens(token, usdcIn);
    }

    /// @notice USDC received for selling `tokensIn` at current curve state.
    function tokensToPrice(address token, uint256 tokensIn) external view returns (uint256) {
        return _tokensToPrice(token, tokensIn);
    }

    /**
     * @dev Linear bonding curve: price = startingPrice * (1 + sold / threshold).
     *      Integral from sold to sold+out gives the USDC required. Simplified
     *      linear approximation for predictable pricing.
     */
    function _priceToTokens(address token, uint256 usdcIn) internal view returns (uint256) {
        TokenInfo storage info = tokens[token];
        uint256 price = _currentPrice(token);
        uint256 tokens = (usdcIn * 1e18) / price;
        return tokens;
    }

    function _tokensToPrice(address token, uint256 tokensIn) internal view returns (uint256) {
        TokenInfo storage info = tokens[token];
        uint256 price = _currentPrice(token);
        uint256 usdc = (tokensIn * price) / 1e18;
        return usdc;
    }

    /// @notice Current marginal price of a token (USDC per 1e18 token).
    function _currentPrice(address token) internal view returns (uint256) {
        TokenInfo storage info = tokens[token];
        uint256 progress = (info.sold * 1e18) / info.graduationThreshold;
        // price scales linearly from startingPrice to 4x startingPrice at 100%
        return info.startingPrice * (1e18 + progress * 3 / 1e18) / 1e18;
    }

    /* ============ Getters ============ */

    function getTokenCount() external view returns (uint256) {
        return tokenList.length;
    }

    function getTokenAt(uint256 i) external view returns (TokenInfo memory) {
        return tokens[tokenList[i]];
    }

    function getAllTokens() external view returns (TokenInfo[] memory) {
        TokenInfo[] memory all = new TokenInfo[](tokenList.length);
        for (uint256 i = 0; i < tokenList.length; i++) {
            all[i] = tokens[tokenList[i]];
        }
        return all;
    }
}

/**
 * @title BondingCurveToken
 * @notice Minimal ERC20 used for bonding-curve tokens on Arcodex.
 */
contract BondingCurveToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    address public immutable factory;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    modifier onlyFactory() {
        require(msg.sender == factory, "only factory");
        _;
    }

    constructor(string memory _name, string memory _symbol, address _factory) {
        name = _name;
        symbol = _symbol;
        factory = _factory;
    }

    function mint(address to, uint256 amount) external onlyFactory {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
