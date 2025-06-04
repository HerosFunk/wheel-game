import { io } from 'socket.io-client';

const URL = "https://wheel-game.azurewebsites.net/";

export const socket = io(URL);