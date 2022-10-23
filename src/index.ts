import dotenv from "dotenv";
import { SanAlbertoBot } from "./bot";
import { code } from "./code";

dotenv.config();

console.log(JSON.stringify(process.env));

new SanAlbertoBot().implement(code).launch();
