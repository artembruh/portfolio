import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Chain } from './chain.enum';
import { TokenLookupFactory } from './factories/token-lookup.factory';
import { TokenInfo } from './dto/token-info.dto';
import { getErrorMessage } from './utils/get-error-message';

const CLIENT_ERROR_PATTERNS = [
  'Invalid EVM address',
  'Invalid Solana address',
  'Not an ERC-20 token contract',
  'Not an SPL token mint account',
  'Not a valid SPL token mint account',
  'Account not found',
];

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
      const message = getErrorMessage(err);

      if (CLIENT_ERROR_PATTERNS.some((p) => message.includes(p))) {
        throw new BadRequestException(message);
      }

      this.logger.warn(`[${chain}] Token lookup failed for ${address}: ${message}`);
      throw new InternalServerErrorException('Token lookup failed');
    }
  }
}
