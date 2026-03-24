import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Chain } from './chain.enum';
import { TokenLookupFactory } from './factories/token-lookup.factory';
import { TokenInfo } from './dto/token-info.dto';
import { getErrorMessage } from './utils/get-error-message';

@Controller('blockchain')
export class BlockchainController {
  private readonly logger = new Logger(BlockchainController.name);

  constructor(private readonly tokenLookup: TokenLookupFactory) {}

  @Get(':chain/token/:address')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async getToken(
    @Param('chain', new ParseEnumPipe(Chain)) chain: Chain,
    @Param('address') address: string,
  ): Promise<TokenInfo> {
    try {
      return await this.tokenLookup.get(chain).getTokenInfo(address);
    } catch (err) {
      this.logger.warn(`[${chain}] Token lookup failed for ${address}: ${getErrorMessage(err)}`);
      throw new InternalServerErrorException('Token lookup failed');
    }
  }
}
