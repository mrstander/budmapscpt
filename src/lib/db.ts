import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL!);

export async function query<T>(sql: string, params?: any[]): Promise<T> {
    const [results] = await pool.execute(sql, params);
    return results as T;
}

export default pool;
