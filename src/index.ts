import dotenv from "dotenv";

import { SanAlbertoBot } from "./bot";

import adminsModule from "./modules/admins";
import baseModule from "./modules/base";
import dbModule from "./modules/db";
import displayModule from "./modules/display";
import pointsModule from "./modules/points";

dotenv.config();

new SanAlbertoBot()
  .implement(baseModule)
  .implement(adminsModule)
  .implement(dbModule)
  .implement(pointsModule)
  .implement(displayModule)
  .launch();
