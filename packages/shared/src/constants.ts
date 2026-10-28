export const DEFAULT_ANTI_SNIPE_TRIGGER_SECONDS = 30;
export const DEFAULT_ANTI_SNIPE_EXTEND_SECONDS = 120;
export const MIN_BID_INCREMENT_DEFAULT = 1.0;
export const DEFAULT_CLOSURE_WORKER_INTERVAL_MS = 10000;

export const WS_EVENTS = {
  // Client to Server
  JOIN_AUCTION: 'auction:join',
  LEAVE_AUCTION: 'auction:leave',
  
  // Server to Client Broadcasts
  BID_ACCEPTED: 'bid:accepted',
  BID_REJECTED: 'bid:rejected',
  AUCTION_UPDATED: 'auction:updated',
  AUCTION_EXTENDED: 'auction:extended',
  AUCTION_CLOSED: 'auction:closed',
  
  // User targeted
  NOTIFICATION_NEW: 'notification:new',
  OUTBID_ALERT: 'auction:outbid',
} as const;
