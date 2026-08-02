// Tokens launched across different launchpads on Arc.
// Aggregated view: users can buy/swap any of these directly on Arcodex.

export interface ArcToken {
  address: string;
  fullAddress: string;
  symbol: string;
  name: string;
  image: string;
  launchpad: string; // which launchpad it launched on
  priceUsdc: number;
  mcapUsdc: number;
  change24h: number;
  volume24h: number;
  holders: number;
  liquidityUsdc: number;
  ageH: number;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  poolAddress: string;
}

export const LAUNCHPADS = [
  "Arcodex",
  "ArcPad",
  "NovaFun",
  "OrbitLaunch",
  "PumpArc",
  "NebulaPad",
];

export const arcTokens: ArcToken[] = [
  { address: "0xAT1...", fullAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", symbol: "APX", name: "Apex", image: "/tokens/arcl.svg", launchpad: "Arcodex", priceUsdc: 0.0042, mcapUsdc: 184_320, change24h: 18.4, volume24h: 96_540, holders: 1284, liquidityUsdc: 210_000, ageH: 26, website: "https://apex.arc", twitter: "apexarc", telegram: "apexarc", poolAddress: "0x4bF4bF4bF4bF4bF4bF4bF4bF4bF4bF4bF4bF4bF4" },
  { address: "0xAT2...", fullAddress: "0x9a8fC4cE7bEfF4aDcD9735AFf958023239c6A064", symbol: "ORB", name: "Orbit", image: "/tokens/grid.svg", launchpad: "ArcPad", priceUsdc: 0.0137, mcapUsdc: 274_000, change24h: -6.2, volume24h: 41_230, holders: 842, liquidityUsdc: 148_000, ageH: 52, twitter: "orbitarc", website: "https://orbit.arc", poolAddress: "0x5aC5aC5aC5aC5aC5aC5aC5aC5aC5aC5aC5aC5aC5" },
  { address: "0xAT3...", fullAddress: "0x7bE8dC1fA3cDd4eFcD9735AFf958023239c6A065", symbol: "NVA", name: "Nova", image: "/tokens/nova.svg", launchpad: "NovaFun", priceUsdc: 0.00092, mcapUsdc: 55_200, change24h: 42.7, volume24h: 128_900, holders: 2103, liquidityUsdc: 66_000, ageH: 9, twitter: "novaterminal", telegram: "novaterminal", website: "https://nova.arc", poolAddress: "0x6dC6dC6dC6dC6dC6dC6dC6dC6dC6dC6dC6dC6dC6" },
  { address: "0xAT4...", fullAddress: "0x3aF5bE2dD9cEeFfAaBcD9735AFf958023239c6A066", symbol: "FLX", name: "Flux", image: "/tokens/flux.svg", launchpad: "OrbitLaunch", priceUsdc: 0.051, mcapUsdc: 510_000, change24h: 3.1, volume24h: 22_480, holders: 521, liquidityUsdc: 320_000, ageH: 88, twitter: "fluxbridge", website: "https://flux.arc", poolAddress: "0x2eE2eE2eE2eE2eE2eE2eE2eE2eE2eE2eE2eE2eE2" },
  { address: "0xAT5...", fullAddress: "0xc1d9eF3bB7aA4cCdDeFcD9735AFf958023239c6A067", symbol: "PLS", name: "Pulse", image: "/tokens/pulse.svg", launchpad: "PumpArc", priceUsdc: 0.0077, mcapUsdc: 115_500, change24h: -12.8, volume24h: 33_750, holders: 968, liquidityUsdc: 92_000, ageH: 40, twitter: "pulseprotocol", discord: "pulseprotocol", website: "https://pulse.arc", poolAddress: "0x8aA8aA8aA8aA8aA8aA8aA8aA8aA8aA8aA8aA8aA8" },
  { address: "0xAT6...", fullAddress: "0xdB2cF8aD4eFf66BbCcD9735AFf958023239c6A068", symbol: "ZRO", name: "Zero", image: "/tokens/zero.svg", launchpad: "NebulaPad", priceUsdc: 0.0021, mcapUsdc: 42_000, change24h: 9.6, volume24h: 18_300, holders: 356, liquidityUsdc: 51_000, ageH: 17, twitter: "zerogas", website: "https://zero.arc", poolAddress: "0x9bB9bB9bB9bB9bB9bB9bB9bB9bB9bB9bB9bB9bB9" },
  { address: "0xAT7...", fullAddress: "0xeC3dD2bE5Ff99aAbBcD9735AFf958023239c6A069", symbol: "ECH", name: "Echo", image: "/tokens/echo.svg", launchpad: "ArcPad", priceUsdc: 0.00043, mcapUsdc: 21_500, change24h: 27.3, volume24h: 64_100, holders: 1735, liquidityUsdc: 38_000, ageH: 4, twitter: "echosocial", telegram: "echosocial", website: "https://echo.arc", poolAddress: "0x1dD1dD1dD1dD1dD1dD1dD1dD1dD1dD1dD1dD1dD1" },
  { address: "0xAT8...", fullAddress: "0xfA4eE1cC7dD55bBbCcD9735AFf958023239c6A070", symbol: "VGA", name: "Vega", image: "/tokens/vega.svg", launchpad: "NovaFun", priceUsdc: 0.0188, mcapUsdc: 188_000, change24h: -2.4, volume24h: 51_920, holders: 1104, liquidityUsdc: 140_000, ageH: 64, twitter: "vegamarkets", website: "https://vega.arc", poolAddress: "0x0cC0cC0cC0cC0cC0cC0cC0cC0cC0cC0cC0cC0cC0" },
  { address: "0xAT9...", fullAddress: "0xaB5fF2dD8cEe99AaBcD9735AFf958023239c6A071", symbol: "SMT", name: "Summit", image: "/tokens/echo.svg", launchpad: "PumpArc", priceUsdc: 0.0066, mcapUsdc: 99_000, change24h: 11.2, volume24h: 27_400, holders: 688, liquidityUsdc: 74_000, ageH: 21, twitter: "summitarc", website: "https://summit.arc", poolAddress: "0x3eE3eE3eE3eE3eE3eE3eE3eE3eE3eE3eE3eE3eE3" },
  { address: "0xAT10...", fullAddress: "0x4c6dD1bB9fAa88BbCcD9735AFf958023239c6A072", symbol: "HZN", name: "Horizon", image: "/tokens/flux.svg", launchpad: "OrbitLaunch", priceUsdc: 0.029, mcapUsdc: 290_000, change24h: 5.8, volume24h: 45_120, holders: 932, liquidityUsdc: 176_000, ageH: 73, twitter: "horizonarc", telegram: "horizonarc", website: "https://horizon.arc", poolAddress: "0x5fF5fF5fF5fF5fF5fF5fF5fF5fF5fF5fF5fF5fF5" },
  { address: "0xAT11...", fullAddress: "0x6dA7cC2eE8bB99CcDd9735AFf958023239c6A073", symbol: "KRN", name: "Koruna", image: "/tokens/grid.svg", launchpad: "NebulaPad", priceUsdc: 0.0011, mcapUsdc: 33_000, change24h: -3.9, volume24h: 12_750, holders: 421, liquidityUsdc: 29_000, ageH: 12, twitter: "korunaarc", website: "https://koruna.arc", poolAddress: "0x7aA7aA7aA7aA7aA7aA7aA7aA7aA7aA7aA7aA7aA7" },
  { address: "0xAT12...", fullAddress: "0x8bB8cC3dDfEe99AaBcD9735AFf958023239c6A074", symbol: "LYNX", name: "Lynx", image: "/tokens/nova.svg", launchpad: "Arcodex", priceUsdc: 0.0084, mcapUsdc: 168_000, change24h: 23.6, volume24h: 88_300, holders: 1540, liquidityUsdc: 120_000, ageH: 31, twitter: "lynxarc", telegram: "lynxarc", website: "https://lynx.arc", poolAddress: "0x9cC9cC9cC9cC9cC9cC9cC9cC9cC9cC9cC9cC9cC9" },
];
