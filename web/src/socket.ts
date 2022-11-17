import { io } from "socket.io-client";

export const socket = io("ws://127.0.0.1:3000");
console.log("loaded socket");
