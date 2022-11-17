import { io } from "socket.io-client";

export const socket = io("https://defc.wupp.dev");
console.log("loaded socket");
