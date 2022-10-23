import dotenv from "dotenv";

import { SanAlbertoBot } from "./bot";

import baseModule from "./modules/base";
import adminsModule from "./modules/admins";
import dbModule from "./modules/db";
import pointsModule from "./modules/points";
import displayModule from "./modules/display";

dotenv.config();

new SanAlbertoBot()
  .implement(baseModule)
  .implement(adminsModule)
  .implement(dbModule)
  .implement(pointsModule)
  .implement(displayModule)
  .launch();
