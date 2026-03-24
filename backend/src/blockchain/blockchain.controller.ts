import {
  Controller,
  Get,
  Param,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BlockchainService } from './services/blockchain.service';
import { TokenInfo } from './dto/token-info.dto';
import { getErrorMessage } from './utils/get-error-message';

@Controller('blockchain')
export class BlockchainController {
  private readonly logger = new Logger(BlockchainController.name);

  constructor(private readonly blockchainService: BlockchainService) {}

  @Get(':chain/token/:address')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async getToken(
    @Param('chain') chain: string,
    @Param('address') address: string,
  ): Promise<TokenInfo> {
    if (!this.blockchainService.getSupportedChains().includes(chain.toLowerCase())) {
      throw new BadRequestException(`Unsupported chain: ${chain}`);
    }

    try {
      return await this.blockchainService.getTokenLookup(chain.toLowerCase()).getTokenInfo(address);
    } catch (err) {
      this.logger.warn(`[${chain}] Token lookup failed for ${address}: ${getErrorMessage(err)}`);
      throw new InternalServerErrorException('Token lookup failed');
    }
  }
}
