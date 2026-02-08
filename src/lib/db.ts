import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';

let pool: Pool | null = null;

/**
 * Get or create the database connection pool.
 * Uses lazy initialization to prevent pool creation during build time.
 */
export function getPool(): Pool {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is not defined');
        }
        pool = mysql.createPool(process.env.DATABASE_URL);
    }
    return pool;
}

export async function query<T>(sql: string, params?: any[]): Promise<T> {
    const connection = getPool();
    const [results] = await connection.execute(sql, params);
    return results as T;
}

export default getPool;
