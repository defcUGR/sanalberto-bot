import bunyan from "bunyan";
import { config } from "./config";

// JSON lines on stdout only: pm2 or Docker store and rotate them. Never log
// the environment or tokens.
export const logger = bunyan.createLogger({
  name: "sanalberto-bot",
  level: config.logLevel,
  serializers: { err: bunyan.stdSerializers.err },
});

export type Logger = bunyan;
