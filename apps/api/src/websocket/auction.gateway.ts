import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WS_EVENTS } from '@bidflow/shared';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AuctionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AuctionGateway.name);

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization || client.handshake.auth?.token;
      if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'bidflow-ultra-secure-jwt-secret-key-cse-2026-btech-token',
        });
        client.data.user = payload;
        // Automatically join private user room for targeted notifications
        client.join(`user:${payload.sub}`);
        this.logger.log(`Authenticated client connected: ${client.id} (user: ${payload.sub})`);
      } else {
        this.logger.log(`Anonymous client connected: ${client.id}`);
      }
    } catch (err) {
      this.logger.warn(`Client connected with invalid token: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(WS_EVENTS.JOIN_AUCTION)
  handleJoinAuction(@ConnectedSocket() client: Socket, @MessageBody() data: { auctionId: string }) {
    if (data?.auctionId) {
      const room = `auction:${data.auctionId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined ${room}`);
      return { status: 'joined', room };
    }
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_AUCTION)
  handleLeaveAuction(@ConnectedSocket() client: Socket, @MessageBody() data: { auctionId: string }) {
    if (data?.auctionId) {
      const room = `auction:${data.auctionId}`;
      client.leave(room);
      this.logger.log(`Client ${client.id} left ${room}`);
      return { status: 'left', room };
    }
  }

  // Server broadcast helpers
  broadcastBidAccepted(auctionId: string, payload: any) {
    this.server.to(`auction:${auctionId}`).emit(WS_EVENTS.BID_ACCEPTED, payload);
  }

  broadcastAuctionExtended(auctionId: string, payload: any) {
    this.server.to(`auction:${auctionId}`).emit(WS_EVENTS.AUCTION_EXTENDED, payload);
  }

  broadcastAuctionClosed(auctionId: string, payload: any) {
    this.server.to(`auction:${auctionId}`).emit(WS_EVENTS.AUCTION_CLOSED, payload);
  }

  sendUserOutbidAlert(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit(WS_EVENTS.OUTBID_ALERT, payload);
  }

  sendUserNotification(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit(WS_EVENTS.NOTIFICATION_NEW, payload);
  }
}
