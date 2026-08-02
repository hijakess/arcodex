// Core types for the Arc launchpad

export type BondingType = "standard" | "early-buy";

export interface CreatorInfo {
  wallet: string;
  xHandle?: string;
  feeBps: number; // creator fee in basis points
  claimed: number; // USDC already claimed
  claimable: number; // USDC currently claimable
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  description: string;
  image: string;
  bondingType: BondingType;
  priceUsdc: number;
  mcapUsdc: number;
  supply: number;
  change24h: number;
  volume24h: number;
  holders: number;
  bondingProgress: number; // 0-100, when 100 the bonding curve graduates to AMM
  trades24h: number;
  createdAt: number; // timestamp
  creator: CreatorInfo;
  tags: string[];
  tweet?: string;
}

export interface Trade {
  id: string;
  tokenAddress: string;
  wallet: string;
  isBuy: boolean;
  amountUsdc: number;
  tokenAmount: number;
  time: number;
  isCreator: boolean;
}

export interface Holding {
  tokenAddress: string;
  symbol: string;
  name: string;
  image: string;
  amount: number;
  avgCostUsdc: number;
  currentPriceUsdc: number;
  pnlUsdc: number;
}
