import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinAuction: (auctionId: string) => void;
  leaveAuction: (auctionId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinAuction: () => {},
  leaveAuction: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const s = io(window.location.origin, {
      path: '/socket.io',
      auth: { token: token ? `Bearer ${token}` : undefined },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setIsConnected(true);
      console.log('⚡ Socket.IO connected:', s.id);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
      console.log('⚡ Socket.IO disconnected');
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token]);

  const joinAuction = (auctionId: string) => {
    if (socket && isConnected) {
      socket.emit('auction:join', { auctionId });
    }
  };

  const leaveAuction = (auctionId: string) => {
    if (socket && isConnected) {
      socket.emit('auction:leave', { auctionId });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinAuction, leaveAuction }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
