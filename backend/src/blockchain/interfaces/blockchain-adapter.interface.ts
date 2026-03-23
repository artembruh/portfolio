import { BlockInfo } from '../dto/block-info.dto';
import { TokenInfo } from '../dto/token-info.dto';

export interface BlockchainAdapter {
  getLatestBlock(): BlockInfo;
  getAvgBlockTime(): number;
  getTokenInfo(address: string): Promise<TokenInfo>;
  onBlock(callback: () => void): void;
  destroy(): void;
}
