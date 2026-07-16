/**
 * Ensures `apps/api/.env` is loaded when geo/catalog seeds run via `ts-node`
 * from any working directory (e.g. monorepo root vs `apps/api`).
 */
import { config } from "dotenv";
import { resolve } from "node:path";

const apiEnv = resolve(__dirname, "../.env");
config({ path: apiEnv });
config();
