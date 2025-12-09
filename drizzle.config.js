"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const drizzle_kit_1 = require("drizzle-kit");
const dotenv = tslib_1.__importStar(require("dotenv"));
dotenv.config();
exports.default = (0, drizzle_kit_1.defineConfig)({
    schema: './src/db/schema/index.ts',
    out: './src/db/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    },
    verbose: true,
    strict: true,
});
