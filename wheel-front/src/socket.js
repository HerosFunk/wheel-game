import { io } from 'socket.io-client';
import config from './config/config';

// In production, socket.io connects via /spin-game/socket.io/ path (nginx proxies to backend)
const socketOptions = process.env.NODE_ENV === 'production'
  ? { path: '/spin-game/socket.io/' }
  : {};

export const socket = io(config.apiUrl || undefined, socketOptions);
