import { io } from 'socket.io-client';

// In production, socket.io connects to same origin via /spin-game/socket.io/ path (nginx proxies to backend)
// In dev, connect directly to localhost:3000
const socket = io({ path: '/spin-game/socket.io/' })

export { socket };
