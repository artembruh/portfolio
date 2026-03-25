import { BadRequestException } from '@nestjs/common';
import { isAddress as isEvmAddress } from 'ethers';
import { isAddress as isSolanaAddress } from '@solana/kit';
import { Chain } from '../chain.enum';

export function validateTokenAddress(chain: Chain, address: string): void {
  if (chain === Chain.Solana) {
    if (!isSolanaAddress(address)) {
      throw new BadRequestException(`Invalid Solana address: ${address}`);
    }
    return;
  }
  if (!isEvmAddress(address)) {
    throw new BadRequestException(`Invalid EVM address: ${address}`);
  }
}
