import { Module } from '@nestjs/common';
import { TokenLookupFactory } from './factories/token-lookup.factory';
import { BlockSubscriberFactory } from './factories/block-subscriber.factory';
import { BlockchainGateway } from './blockchain.gateway';
import { BlockchainController } from './blockchain.controller';

@Module({
  controllers: [BlockchainController],
  providers: [TokenLookupFactory, BlockSubscriberFactory, BlockchainGateway],
})
export class BlockchainModule {}
