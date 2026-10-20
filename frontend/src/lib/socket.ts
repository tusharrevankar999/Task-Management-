import { io, Socket } from 'socket.io-client';
import { TOKEN_KEY } from './api';

let socket: Socket | null = null;

export function getSocket(token?: string | null): Socket {
  const authToken = token || localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
  const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const backendUrl = apiUrl.replace(/\/api\/?$/, '');

  if (!socket) {
    socket = io(backendUrl, {
      autoConnect: false,
      auth: {
        token: authToken,
      },
      transports: ['websocket', 'polling'],
    });
  } else if (authToken) {
    socket.auth = { token: authToken };
  }

  return socket;
}

export function connectSocket(token: string): Socket {
  const s = getSocket(token);
  s.auth = { token };
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
