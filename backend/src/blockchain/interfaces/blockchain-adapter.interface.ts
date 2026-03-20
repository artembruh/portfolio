import { BlockInfo } from '../dto/block-info.dto';
import { TokenInfo } from '../dto/token-info.dto';

export interface BlockchainAdapter {
  getLatestBlock(): Promise<BlockInfo>;
  getAvgBlockTime(): Promise<number>;
  getTokenInfo(address: string): Promise<TokenInfo>;
  onBlock(callback: () => void): void;
}
