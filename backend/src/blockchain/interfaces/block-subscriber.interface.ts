import { BlockInfo } from '../dto/block-info.dto';

export interface BlockSubscriber {
  getLatestBlock(): BlockInfo;
  getAvgBlockTime(): number;
  onBlock(callback: () => void): void;
  destroy(): void;
}
