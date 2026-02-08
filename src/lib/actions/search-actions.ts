'use server';
import { query } from '@/lib/db';

const serializeDate = (date: any): string | null => {
    if (!date) return null;
    return new Date(date).toISOString();
};

export async function searchGlobal(term: string) {
    if (!term || term.length < 2) return { dispensaries: [], products: [] };

    try {
        const dispensaries = await query<any[]>('SELECT * FROM `dispensary` WHERE (name LIKE ? OR city LIKE ? OR address LIKE ?) LIMIT 5', [`%${term}%`, `%${term}%`, `%${term}%`]);

        const products = await query<any[]>(`
            SELECT p.*, d.name as dispensaryName, d.slug as dispensarySlug, d.isFeatured as dIsFeatured, d.imageUrl as dImageUrl, d.city as dCity, d.state as dState, d.suburb as dSuburb
            FROM \`product\` p
            JOIN \`dispensary\` d ON p.dispensaryId = d.id
            WHERE (p.name LIKE ? OR p.description LIKE ? OR d.name LIKE ?)
        `, [`%${term}%`, `%${term}%`, `%${term}%`]);

        return {
            dispensaries: dispensaries.map(d => ({ ...d, createdAt: serializeDate(d.createdAt), updatedAt: serializeDate(d.updatedAt) })),
            products: products.map(p => ({
                ...p,
                createdAt: serializeDate(p.createdAt),
                updatedAt: serializeDate(p.updatedAt),
                dispensary: { name: p.dispensaryName, slug: p.dispensarySlug }
            }))
        };
    } catch (error) {
        console.error("Search error:", error);
        return { dispensaries: [], products: [] };
    }
}

export async function getDispensariesByRegion(stateSlug: string, citySlug?: string) {
    const stateName = stateSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const cityName = citySlug ? citySlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : null;

    try {
        let sql = 'SELECT * FROM `dispensary` WHERE state = ?';
        let params = [stateName];

        if (cityName) {
            sql += ' AND city = ?';
            params.push(cityName);
        }

        sql += ' ORDER BY name ASC';

        const dispensaries = await query<any[]>(sql, params);

        return {
            stateName,
            cityName,
            dispensaries: dispensaries.map(d => ({
                ...d,
                createdAt: serializeDate(d.createdAt),
                updatedAt: serializeDate(d.updatedAt),
            }))
        };
    } catch (error) {
        console.error("Error fetching dispensaries by region:", error);
        return { stateName, cityName, dispensaries: [] };
    }
}
