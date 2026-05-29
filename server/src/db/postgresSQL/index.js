import 'dotenv/config';

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema/index.js';

const connectionString = process.env.POSTGRESSQL_URL;

export const getDb = () => {
        if (!connectionString) {
                throw new Error('POSTGRESSQL_URL is required to access the database');
        }

        const pool = new Pool({ connectionString });
        return drizzle(pool, { schema });
};

export const db = connectionString ? getDb() : null;
