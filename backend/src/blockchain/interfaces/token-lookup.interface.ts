import { TokenInfo } from '../dto/token-info.dto';

export interface TokenLookup {
  getTokenInfo(address: string): Promise<TokenInfo>;
}
