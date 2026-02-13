import { io } from 'socket.io-client';
import config from './config/config';

// When apiUrl is empty (production with nginx proxy), connect to same origin
export const socket = io(config.apiUrl || undefined);