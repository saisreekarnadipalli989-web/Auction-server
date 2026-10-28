import { Module } from '@nestjs/common';
import { AuctionClosureWorker } from './auction-closure.worker';

@Module({
  providers: [AuctionClosureWorker],
  exports: [AuctionClosureWorker],
})
export class WorkersModule {}
