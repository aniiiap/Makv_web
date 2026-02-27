import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useTaskManagerAuth } from './taskManager.AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useTaskManagerAuth();
  const SERVER_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5004';

  useEffect(() => {
    if (user) {
      const newSocket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('join-user-room', user.id);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user, SERVER_URL]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

