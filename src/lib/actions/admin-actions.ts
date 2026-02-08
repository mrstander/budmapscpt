'use server';

import { query } from "@/lib/db";
import crypto from 'crypto';

const serializeDate = (date: any): string | null => {
    if (!date) return null;
    return new Date(date).toISOString();
};

const mapDispensary = (d: any) => ({
    ...d,
    coordinates: typeof d.coordinates === 'string' ? JSON.parse(d.coordinates) : d.coordinates,
    offers: typeof d.offers === 'string' ? JSON.parse(d.offers) : d.offers,
    hours: typeof d.hours === 'string' ? JSON.parse(d.hours) : d.hours,
    categoryIds: typeof d.categoryIds === 'string' ? JSON.parse(d.categoryIds) : d.categoryIds,
    createdAt: serializeDate(d.createdAt),
    updatedAt: serializeDate(d.updatedAt),
    isFeatured: Boolean(d.isFeatured),
});

const mapProduct = (p: any) => ({
    ...p,
    pricing: typeof p.pricing === 'string' ? JSON.parse(p.pricing) : p.pricing,
    ediblePricing: typeof p.ediblePricing === 'string' ? JSON.parse(p.ediblePricing) : p.ediblePricing,
    sodaPricing: typeof p.sodaPricing === 'string' ? JSON.parse(p.sodaPricing) : p.sodaPricing,
    additionalImageUrls: typeof p.additionalImageUrls === 'string' ? JSON.parse(p.additionalImageUrls) : p.additionalImageUrls,
    createdAt: serializeDate(p.createdAt),
    updatedAt: serializeDate(p.updatedAt),
    isFeatured: Boolean(p.isFeatured),
    isHotDeal: Boolean(p.isHotDeal),
});

const mapOrder = (o: any) => ({
    ...o,
    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
    createdAt: serializeDate(o.createdAt),
    updatedAt: serializeDate(o.updatedAt),
    confirmedAt: serializeDate(o.confirmedAt),
    pickedUpAt: serializeDate(o.pickedUpAt),
    completedAt: serializeDate(o.completedAt),
});

const mapUser = (u: any) => ({
    ...u,
    createdAt: serializeDate(u.createdAt),
    updatedAt: serializeDate(u.updatedAt),
});

export async function getUserCountByRole(role: string) {
    try {
        const rows = await query<any[]>('SELECT COUNT(*) as count FROM `user` WHERE role = ?', [role]);
        return rows[0]?.count || 0;
    } catch (error) {
        console.error(`Error fetching count for role ${role}:`, error);
        return 0;
    }
}

export async function getAllProducts() {
    try {
        const rows = await query<any[]>(`
            SELECT p.*, d.name as dispensaryName, d.slug as dispensarySlug, 
                   d.isFeatured as dIsFeatured, d.imageUrl as dImageUrl, 
                   d.city as dCity, d.state as dState, d.suburb as dSuburb,
                   d.createdAt as dCreatedAt, d.updatedAt as dUpdatedAt
            FROM \`product\` p
            JOIN \`dispensary\` d ON p.dispensaryId = d.id
            ORDER BY p.name ASC
        `);

        return rows.map(p => ({
            ...mapProduct(p),
            dispensary: {
                id: p.dispensaryId,
                name: p.dispensaryName,
                slug: p.dispensarySlug,
                isFeatured: Boolean(p.dIsFeatured),
                imageUrl: p.dImageUrl,
                city: p.dCity,
                state: p.dState,
                suburb: p.dSuburb,
                createdAt: serializeDate(p.dCreatedAt),
                updatedAt: serializeDate(p.dUpdatedAt)
            }
        }));
    } catch (error) {
        console.error("Error fetching all products:", error);
        return [];
    }
}

export async function addProduct(data: any) {
    try {
        const id = crypto.randomUUID();
        const p = data;

        const sql = `
            INSERT INTO \`product\` (
                id, dispensaryId, name, slug, description, type, strain, thc, cbd, 
                price, weight, pricing, ediblePricing, sodaPricing, imageId, 
                imageUrl, additionalImageUrls, stock, isFeatured, isHotDeal, salePrice,
                effectsLength, benefits, flavour, ingredients,
                createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        await query(sql, [
            id, p.dispensaryId, p.name, p.slug || null, p.description || null, p.type, p.strain || null, p.thc || null, p.cbd || null,
            p.price || null, p.weight || null, JSON.stringify(p.pricing || []), JSON.stringify(p.ediblePricing || []),
            JSON.stringify(p.sodaPricing || []), p.imageId, p.imageUrl || null, JSON.stringify(p.additionalImageUrls || []),
            p.stock || 0, p.isFeatured ? 1 : 0, p.isHotDeal ? 1 : 0, p.salePrice || null,
            p.effectsLength || null, p.benefits || null, p.flavour || null, p.ingredients || null
        ]);

        return { success: true, product: { id, ...p } };
    } catch (error: any) {
        console.error("Error adding product:", error);
        return { error: error.message };
    }
}

export async function deleteProduct(dispensaryId: string, productId: string) {
    try {
        await query('DELETE FROM `product` WHERE id = ?', [productId]);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting product:", error);
        return { error: error.message };
    }
}

export async function toggleProductFeatured(dispensaryId: string, productId: string, isFeatured: boolean) {
    try {
        await query('UPDATE `product` SET isFeatured = ?, updatedAt = NOW() WHERE id = ?', [isFeatured ? 1 : 0, productId]);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating product featured status:", error);
        return { error: error.message };
    }
}

export async function getAllOrders() {
    try {
        const rows = await query<any[]>('SELECT * FROM `order` ORDER BY createdAt DESC');
        return rows.map(mapOrder);
    } catch (error) {
        console.error("Error fetching all orders:", error);
        return [];
    }
}

export async function getDispensary(id: string) {
    try {
        const rows = await query<any[]>('SELECT * FROM `dispensary` WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        return mapDispensary(rows[0]);
    } catch (error) {
        console.error("Error fetching dispensary:", error);
        return null;
    }
}

export async function updateDispensary(id: string, data: any) {
    try {
        const d = data;
        const fields = [];
        const params = [];

        for (const key in d) {
            if (d[key] !== undefined) {
                fields.push(`${key} = ?`);
                let val = d[key];
                if (['coordinates', 'offers', 'hours', 'categoryIds'].includes(key)) {
                    val = JSON.stringify(val);
                } else if (key === 'isFeatured') {
                    val = val ? 1 : 0;
                }
                params.push(val);
            }
        }

        if (fields.length === 0) return { success: true };

        const sql = `UPDATE \`dispensary\` SET ${fields.join(', ')}, updatedAt = NOW() WHERE id = ?`;
        params.push(id);

        await query(sql, params);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating dispensary:", error);
        return { error: error.message };
    }
}

export async function getAllDispensaries() {
    try {
        const rows = await query<any[]>('SELECT * FROM `dispensary` ORDER BY name ASC');
        return rows.map(mapDispensary);
    } catch (error) {
        console.error("Error fetching all dispensaries:", error);
        return [];
    }
}

export async function toggleDispensaryFeatured(id: string, isFeatured: boolean) {
    try {
        await query('UPDATE `dispensary` SET isFeatured = ?, updatedAt = NOW() WHERE id = ?', [isFeatured ? 1 : 0, id]);
        return { success: true };
    } catch (error) {
        console.error("Error updating dispensary featured status:", error);
        return { error: "Failed to update status" };
    }
}

export async function getAllUsers() {
    try {
        const rows = await query<any[]>('SELECT * FROM `user` ORDER BY createdAt DESC');
        return rows.map(mapUser);
    } catch (error) {
        console.error("Error fetching all users:", error);
        return [];
    }
}
