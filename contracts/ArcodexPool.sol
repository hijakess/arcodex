// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArcodexPool
 * @notice Constant-product AMM pool (token <-> USDC) for graduated Arcodex
 *         tokens. Deployed by the bonding curve at graduation.
 *
 * Fee model (per user request)
 * ----------------------------
 *   fee = 1.5% of swap notional
 *   creator share = 80% of fee  (1.2%)
 *   platform share = 20% of fee (0.3%)
 *
 * The fee is charged in the OUTPUT asset (standard constant-product AMM
 * style: reserves grow, LP value appreciates). Creator & platform shares are
 * accounted separately and claimable on-chain.
 *
 * @custom:security-contact https://arcodex.app
 */
contract ArcodexPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============ Constants ============ */

    uint256 public constant FEE_BPS = 150; // 1.50% total fee
    uint256 public constant CREATOR_SHARE_BPS = 8000; // 80% of fee
    uint256 public constant PLATFORM_SHARE_BPS = 2000; // 20% of fee
    uint256 public constant BPS = 10_000;

    /* ============ State ============ */

    IERC20 public immutable token;
    IERC20 public immutable usdc;

    address public creatorFeeWallet;
    address public platformTreasury;

    uint256 public reserveToken;
    uint256 public reserveUsdc;

    uint256 public creatorClaimable;
    uint256 public platformClaimable;

    // LP token (minimal ERC20 minted/burned by this pool)
    string public constant name = "Arcodex LP";
    string public constant symbol = "ARCLP";
    uint8 public constant decimals = 18;
    uint256 public totalLiquidity;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public constant MINIMUM_LIQUIDITY = 1_000; // locked LP units

    /* ============ Events ============ */

    event Swap(address indexed sender, bool tokenIn, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed provider, uint256 tokenAmount, uint256 usdcAmount, uint256 lpMinted);
    event LiquidityRemoved(address indexed provider, uint256 tokenAmount, uint256 usdcAmount, uint256 lpBurned);
    event FeesClaimed(address indexed claimer, uint256 amount);

    /* ============ Constructor ============ */

    constructor(
        address _token,
        address _usdc,
        address _creatorFeeWallet,
        address _platformTreasury
    ) Ownable(msg.sender) {
        token = IERC20(_token);
        usdc = IERC20(_usdc);
        creatorFeeWallet = _creatorFeeWallet;
        platformTreasury = _platformTreasury;
    }

    /* ============ Admin ============ */

    function setCreatorFeeWallet(address _wallet) external onlyOwner {
        creatorFeeWallet = _wallet;
    }

    function setPlatformTreasury(address _treasury) external onlyOwner {
        platformTreasury = _treasury;
    }

    /* ============ Swaps ============ */

    /**
     * @notice Swap USDC -> token (buy).
     * @dev 1.5% fee charged in tokens (output asset). Standard x*y=k with fee.
     */
    function swapUsdcIn(uint256 usdcIn, uint256 minTokensOut) external nonReentrant returns (uint256 tokensOut) {
        require(usdcIn > 0, "in=0");
        uint256 fee = (usdcIn * FEE_BPS) / BPS;
        uint256 net = usdcIn - fee;

        uint256 tokensOutBefore = (net * reserveToken) / (reserveUsdc + net);
        // charge the fee in output asset: 1.5% of the token amount
        tokensOut = tokensOutBefore - (tokensOutBefore * FEE_BPS) / BPS;
        require(tokensOut > 0, "out=0");
        require(tokensOut >= minTokensOut, "slippage");

        _accrueFee(tokensOutBefore * FEE_BPS / BPS);

        reserveUsdc += usdcIn;
        reserveToken -= tokensOut;

        usdc.safeTransferFrom(msg.sender, address(this), usdcIn);
        token.safeTransfer(msg.sender, tokensOut);

        emit Swap(msg.sender, false, usdcIn, tokensOut);
    }

    /**
     * @notice Swap token -> USDC (sell).
     * @dev 1.5% fee charged in USDC (output asset).
     */
    function swapTokenIn(uint256 tokenIn, uint256 minUsdcOut) external nonReentrant returns (uint256 usdcOut) {
        require(tokenIn > 0, "in=0");

        uint256 usdcOutBefore = (tokenIn * reserveUsdc) / (reserveToken + tokenIn);
        uint256 fee = (usdcOutBefore * FEE_BPS) / BPS;
        usdcOut = usdcOutBefore - fee;
        require(usdcOut > 0, "out=0");
        require(usdcOut >= minUsdcOut, "slippage");

        _accrueFee(fee);

        reserveToken += tokenIn;
        reserveUsdc -= usdcOut;

        token.safeTransferFrom(msg.sender, address(this), tokenIn);
        usdc.safeTransfer(msg.sender, usdcOut);

        emit Swap(msg.sender, true, tokenIn, usdcOut);
    }

    /* ============ Fees ============ */

    function _accrueFee(uint256 fee) internal {
        uint256 creatorShare = (fee * CREATOR_SHARE_BPS) / BPS;
        uint256 platformShare = fee - creatorShare;
        creatorClaimable += creatorShare;
        platformClaimable += platformShare;
    }

    function claimCreatorFees() external nonReentrant {
        require(msg.sender == creatorFeeWallet, "not creator");
        uint256 amount = creatorClaimable;
        require(amount > 0, "nothing");
        creatorClaimable = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit FeesClaimed(msg.sender, amount);
    }

    function claimPlatformFees() external nonReentrant onlyOwner {
        uint256 amount = platformClaimable;
        require(amount > 0, "nothing");
        platformClaimable = 0;
        usdc.safeTransfer(platformTreasury, amount);
        emit FeesClaimed(platformTreasury, amount);
    }

    /* ============ Liquidity ============ */

    /**
     * @notice Add liquidity, get LP tokens. First deposit seeds the pool at a
     *         fixed ratio; later deposits must match the current ratio.
     */
    function addLiquidity(uint256 tokenAmount, uint256 usdcAmount) external nonReentrant returns (uint256 lpMinted) {
        require(tokenAmount > 0 && usdcAmount > 0, "amt=0");

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        if (totalLiquidity == 0) {
            // first deposit: sqrt(x*y) minus locked minimum
            lpMinted = _sqrt(tokenAmount * usdcAmount) - MINIMUM_LIQUIDITY;
            _mint(address(0xdead), MINIMUM_LIQUIDITY);
        } else {
            uint256 lpToken = (tokenAmount * totalLiquidity) / reserveToken;
            uint256 lpUsdc = (usdcAmount * totalLiquidity) / reserveUsdc;
            lpMinted = lpToken < lpUsdc ? lpToken : lpUsdc;
        }
        require(lpMinted > 0, "lp=0");

        reserveToken += tokenAmount;
        reserveUsdc += usdcAmount;
        _mint(msg.sender, lpMinted);

        emit LiquidityAdded(msg.sender, tokenAmount, usdcAmount, lpMinted);
    }

    /**
     * @notice Burn LP tokens, withdraw pro-rata share of both reserves.
     */
    function removeLiquidity(uint256 lpAmount) external nonReentrant returns (uint256 tokenOut, uint256 usdcOut) {
        require(lpAmount > 0, "lp=0");
        require(balanceOf[msg.sender] >= lpAmount, "balance");

        tokenOut = (lpAmount * reserveToken) / totalLiquidity;
        usdcOut = (lpAmount * reserveUsdc) / totalLiquidity;

        _burn(msg.sender, lpAmount);
        reserveToken -= tokenOut;
        reserveUsdc -= usdcOut;

        token.safeTransfer(msg.sender, tokenOut);
        usdc.safeTransfer(msg.sender, usdcOut);

        emit LiquidityRemoved(msg.sender, tokenOut, usdcOut, lpAmount);
    }

    /* ============ LP ERC20 ============ */

    function _mint(address to, uint256 amount) internal {
        totalLiquidity += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        balanceOf[from] -= amount;
        totalLiquidity -= amount;
        emit Transfer(from, address(0), amount);
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

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /* ============ Views ============ */

    function getReserves() external view returns (uint256, uint256) {
        return (reserveToken, reserveUsdc);
    }

    function getTokenPrice() external view returns (uint256) {
        if (reserveToken == 0) return 0;
        return (reserveUsdc * 1e18) / reserveToken;
    }

    /// @notice Token out for a USDC buy (with fee).
    function quoteUsdcIn(uint256 usdcIn) external view returns (uint256) {
        uint256 fee = (usdcIn * FEE_BPS) / BPS;
        uint256 net = usdcIn - fee;
        uint256 before = (net * reserveToken) / (reserveUsdc + net);
        return before - (before * FEE_BPS) / BPS;
    }

    /// @notice USDC out for a token sell (with fee).
    function quoteTokenIn(uint256 tokenIn) external view returns (uint256) {
        uint256 before = (tokenIn * reserveUsdc) / (reserveToken + tokenIn);
        return before - (before * FEE_BPS) / BPS;
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
