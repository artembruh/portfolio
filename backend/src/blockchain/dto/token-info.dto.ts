export class TokenInfo {
  name!: string;
  symbol!: string;
  decimals!: number;
  totalSupply!: string; // string to preserve BigInt precision
}
