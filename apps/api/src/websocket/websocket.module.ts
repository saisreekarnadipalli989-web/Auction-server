import { Global, Module } from '@nestjs/common';
import { AuctionGateway } from './auction.gateway';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'bidflow-ultra-secure-jwt-secret-key-cse-2026-btech-token',
    }),
  ],
  providers: [AuctionGateway],
  exports: [AuctionGateway],
})
export class WebSocketModule {}
