import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Chain } from './chain.enum';
import { TokenLookupFactory } from './factories/token-lookup.factory';
import { DexScreenerService } from './services/dex-screener.service';
import { TokenInfo } from './dto/token-info.dto';
import { DexPairInfo } from './dto/dex-pair-info.dto';
import { getErrorMessage } from './utils/get-error-message';
import { validateTokenAddress } from './utils/validate-address';

const CLIENT_ERROR_PATTERNS = [
  'Not an ERC-20 token contract',
  'Not an SPL token mint account',
  'Not a valid SPL token mint account',
  'Account not found',
];

@Controller('blockchain')
export class BlockchainController {
  private readonly logger = new Logger(BlockchainController.name);

  constructor(
    private readonly tokenLookup: TokenLookupFactory,
    private readonly dexScreener: DexScreenerService,
  ) {}

  @Get(':chain/token/:address')
  async getToken(
    @Param('chain', new ParseEnumPipe(Chain)) chain: Chain,
    @Param('address') address: string,
  ): Promise<TokenInfo> {
    validateTokenAddress(chain, address);
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

  @Get(':chain/token/:address/pairs')
  async getPairs(
    @Param('chain', new ParseEnumPipe(Chain)) chain: Chain,
    @Param('address') address: string,
  ): Promise<DexPairInfo[]> {
    validateTokenAddress(chain, address);
    return this.dexScreener.getPairs(chain, address);
  }
}
