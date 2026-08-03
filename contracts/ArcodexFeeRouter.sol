// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArcodexFeeRouter
 * @notice Atomic 1-tx fee router on top of the Arc chain DEX routers.
 *
 * Mirrors the RadarDex fee-router pattern but with Arcodex economics:
 *   fee = 1.5% of swap notional (FEE_BPS = 150)
 *   creator share  = 80% of fee (1.2%)
 *   platform share = 20% of fee (0.3%)
 *
 * One call: skims the Arcodex fee, routes the net amount through the
 * underlying DEX router (exactInputSingle), delivers output straight to the
 * user's wallet. Funds only transit — nothing is held.
 *
 * @custom:security-contact https://arcodex.app
 */
contract ArcodexFeeRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============ Constants ============ */

    uint256 public constant MAX_FEE_BPS = 500; // 5% hard cap
    uint256 public constant CREATOR_SHARE_BPS = 8000; // 80% of fee
    uint256 public constant PLATFORM_SHARE_BPS = 2000; // 20% of fee
    uint256 public constant BPS = 10_000;

    /* ============ State ============ */

    uint256 public feeBps = 150; // 1.50% default
    address public platformTreasury;

    /// @notice Per-token creator fee wallet (receives 80% of fees).
    mapping(address => address) public creatorFeeWallet;
    /// @notice Accrued creator fees per token.
    mapping(address => uint256) public creatorClaimable;
    /// @notice Accrued platform fees per token.
    mapping(address => uint256) public platformClaimable;

    /* ============ Events ============ */

    event SwapRouted(address indexed tokenOut, address indexed user, uint256 amountIn, uint256 amountOut);
    event FeeAccrued(address indexed token, uint256 creatorShare, uint256 platformShare);
    event FeeClaimed(address indexed token, address indexed claimer, uint256 amount);

    /* ============ Constructor ============ */

    constructor(address _platformTreasury) Ownable(msg.sender) {
        platformTreasury = _platformTreasury;
    }

    /* ============ Admin ============ */

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "fee too high");
        feeBps = _feeBps;
    }

    function setPlatformTreasury(address _treasury) external onlyOwner {
        platformTreasury = _treasury;
    }

    function setCreatorFeeWallet(address token, address wallet) external onlyOwner {
        creatorFeeWallet[token] = wallet;
    }

    /// @notice Rescue accidentally sent dust (router holds nothing by design).
    function rescue(address token) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) IERC20(token).safeTransfer(msg.sender, bal);
    }

    /* ============ Swap ============ */

    /**
     * @notice Buy or sell through the V3 router with a 1.5% Arcodex fee.
     * @param router       Underlying V3 swap router (e.g. RadarDex swapRouter).
     * @param tokenIn      Input token (USDC when buying, token when selling).
     * @param tokenOut     Output token (token when buying, USDC when selling).
     * @param poolFee      V3 pool fee tier (e.g. 10000 = 1%).
     * @param amountIn     Input amount in tokenIn decimals.
     * @param amountOutMinimum Min output after slippage.
     * @return amountOut  Tokens/USDC delivered to msg.sender.
     */
    function swapExactInput(
        address router,
        address tokenIn,
        address tokenOut,
        uint24 poolFee,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "in=0");

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Skim Arcodex fee (1.5%) off the input
        uint256 fee = (amountIn * feeBps) / BPS;
        uint256 netIn = amountIn - fee;
        require(netIn > 0, "net=0");

        _accrueFee(tokenOut, fee);

        // Route the net amount through the DEX router
        IERC20(tokenIn).forceApprove(router, netIn);
        amountOut = ISwapRouter(router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: msg.sender,
                amountIn: netIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        emit SwapRouted(tokenOut, msg.sender, amountIn, amountOut);
    }

    /* ============ Fees ============ */

    function _accrueFee(address token, uint256 fee) internal {
        uint256 creatorShare = (fee * CREATOR_SHARE_BPS) / BPS;
        uint256 platformShare = fee - creatorShare;
        creatorClaimable[token] += creatorShare;
        platformClaimable[token] += platformShare;
        emit FeeAccrued(token, creatorShare, platformShare);
    }

    /// @notice Creator claims their 80% share for a token.
    function claimCreatorFees(address token) external nonReentrant {
        address wallet = creatorFeeWallet[token];
        require(wallet != address(0) && msg.sender == wallet, "not creator wallet");
        uint256 amount = creatorClaimable[token];
        require(amount > 0, "nothing");
        creatorClaimable[token] = 0;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit FeeClaimed(token, msg.sender, amount);
    }

    /// @notice Platform claims its 20% share for a token.
    function claimPlatformFees(address token) external nonReentrant onlyOwner {
        uint256 amount = platformClaimable[token];
        require(amount > 0, "nothing");
        platformClaimable[token] = 0;
        IERC20(token).safeTransfer(platformTreasury, amount);
        emit FeeClaimed(token, platformTreasury, amount);
    }

    /* ============ Views ============ */

    function effectiveRateBps() external view returns (uint256) {
        return feeBps;
    }

    function creatorRateBps() external view returns (uint256) {
        return (feeBps * CREATOR_SHARE_BPS) / BPS;
    }

    function platformRateBps() external view returns (uint256) {
        return (feeBps * PLATFORM_SHARE_BPS) / BPS;
    }
}

/// @notice Minimal V3 SwapRouter interface (7-field ExactInputSingleParams, no deadline).
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}
