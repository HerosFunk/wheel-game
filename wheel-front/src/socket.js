import { io } from 'socket.io-client';

const URL = "https://wheel-game.azurewebsites.net/api";

export const socket = io(URL);