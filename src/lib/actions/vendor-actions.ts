'use server';

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import pool from "@/lib/db";
import crypto from "crypto";

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

export async function getVendorDispensaries() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const rows = await query<any[]>('SELECT * FROM `dispensary` WHERE vendorId = ?', [session.user.id]);
        return rows.map(mapDispensary);
    } catch (error) {
        console.error("Error fetching vendor dispensaries:", error);
        return [];
    }
}

export async function getVendorOrders() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const dispensaries = await query<any[]>('SELECT id FROM `dispensary` WHERE vendorId = ?', [session.user.id]);
        const dispensaryIds = dispensaries.map(d => d.id);

        if (dispensaryIds.length === 0) return [];

        const rows = await query<any[]>(`
            SELECT * FROM \`order\` 
            WHERE dispensaryId IN (${dispensaryIds.map(() => '?').join(',')}) 
            ORDER BY createdAt DESC
        `, dispensaryIds);

        return rows.map(mapOrder);
    } catch (error) {
        console.error("Error fetching vendor orders:", error);
        return [];
    }
}

export async function updateOrderStatus(orderId: string, status: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    try {
        const orders = await query<any[]>(`
            SELECT o.*, d.vendorId 
            FROM \`order\` o 
            JOIN \`dispensary\` d ON o.dispensaryId = d.id 
            WHERE o.id = ?
        `, [orderId]);

        const order = orders[0];
        if (!order || order.vendorId !== session.user.id) {
            return { error: "Order not found or access denied." };
        }

        let sql = 'UPDATE `order` SET status = ?, updatedAt = NOW()';
        let params = [status];

        if (status === 'confirmed') {
            sql += ', confirmedAt = NOW()';
        }

        sql += ' WHERE id = ?';
        params.push(orderId);

        await query(sql, params);

        revalidatePath('/vendor/dashboard/orders');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating order status:", error);
        return { error: error.message };
    }
}

export async function getVendorStats() {
    const session = await auth();
    if (!session?.user?.id) return null;

    try {
        const dispensaries = await query<any[]>('SELECT id FROM `dispensary` WHERE vendorId = ?', [session.user.id]);
        const dispensaryIds = dispensaries.map(d => d.id);

        if (dispensaryIds.length === 0) {
            return {
                totalRevenue: 0,
                totalCommission: 0,
                totalDeliveryFees: 0,
                totalOrders: 0,
                completedOrders: 0,
                productCount: 0
            };
        }

        const orders = await query<any[]>(`
            SELECT vendorPayout, commission, deliveryFee, status 
            FROM \`order\` 
            WHERE dispensaryId IN (${dispensaryIds.map(() => '?').join(',')})
        `, dispensaryIds);

        const totalRevenue = orders.reduce((sum, o) => sum + (o.vendorPayout || 0), 0);
        const totalCommission = orders.reduce((sum, o) => sum + (o.commission || 0), 0);
        const totalDeliveryFees = orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
        const completedOrders = orders.filter(o => o.status === 'completed').length;

        const productCountRows = await query<any[]>(`
            SELECT COUNT(*) as count 
            FROM \`product\` 
            WHERE dispensaryId IN (${dispensaryIds.map(() => '?').join(',')})
        `, dispensaryIds);

        return {
            totalRevenue,
            totalCommission,
            totalDeliveryFees,
            totalOrders: orders.length,
            completedOrders,
            productCount: productCountRows[0].count
        };
    } catch (error) {
        console.error("Error getting vendor stats:", error);
        return null;
    }
}

export async function getVendorProducts(dispensaryId: string) {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const rows = await query<any[]>('SELECT * FROM `product` WHERE dispensaryId = ? ORDER BY createdAt DESC', [dispensaryId]);
        return rows.map(mapProduct);
    } catch (error) {
        console.error("Error fetching vendor products:", error);
        return [];
    }
}

export async function addProduct(data: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    try {
        const { dispensaryId, ...p } = data;

        const dispensaries = await query<any[]>('SELECT vendorId FROM `dispensary` WHERE id = ?', [dispensaryId]);
        if (!dispensaries[0] || dispensaries[0].vendorId !== session.user.id) {
            return { error: "Dispensary not found or access denied." };
        }

        const id = crypto.randomUUID();
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
            id, dispensaryId, p.name, p.slug || null, p.description || null, p.type, p.strain || null, p.thc || null, p.cbd || null,
            p.price || null, p.weight || null, JSON.stringify(p.pricing || []), JSON.stringify(p.ediblePricing || []),
            JSON.stringify(p.sodaPricing || []), p.imageId || null, p.imageUrl || null, JSON.stringify(p.additionalImageUrls || []),
            p.stock || 0, p.isFeatured ? 1 : 0, p.isHotDeal ? 1 : 0, p.salePrice || null,
            p.effectsLength || null, p.benefits || null, p.flavour || null, p.ingredients || null
        ]);

        revalidatePath('/vendor/dashboard/products');
        return { success: true };
    } catch (error: any) {
        console.error("Error adding product:", error);
        return { error: error.message };
    }
}

export async function updateProduct(productId: string, data: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    try {
        const products = await query<any[]>(`
            SELECT p.*, d.vendorId 
            FROM \`product\` p 
            JOIN \`dispensary\` d ON p.dispensaryId = d.id 
            WHERE p.id = ?
        `, [productId]);

        if (!products[0] || products[0].vendorId !== session.user.id) {
            return { error: "Product not found or access denied." };
        }

        const p = data;
        const fields = [];
        const params = [];

        const allowedFields = [
            'name', 'slug', 'description', 'type', 'strain', 'thc', 'cbd', 'price',
            'weight', 'pricing', 'ediblePricing', 'sodaPricing', 'imageId', 'imageUrl',
            'additionalImageUrls', 'stock', 'isFeatured', 'isHotDeal', 'salePrice',
            'effectsLength', 'benefits', 'flavour', 'ingredients'
        ];

        for (const field of allowedFields) {
            if (field in p) {
                fields.push(`${field} = ?`);
                let val = p[field];
                if (['pricing', 'ediblePricing', 'sodaPricing', 'additionalImageUrls'].includes(field)) {
                    val = JSON.stringify(val);
                } else if (['isFeatured', 'isHotDeal'].includes(field)) {
                    val = val ? 1 : 0;
                }
                params.push(val ?? null);
            }
        }

        if (fields.length === 0) return { success: true };

        const sql = `UPDATE \`product\` SET ${fields.join(', ')}, updatedAt = NOW() WHERE id = ?`;
        params.push(productId);

        await query(sql, params);

        revalidatePath('/vendor/dashboard/products');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating product:", error);
        return { error: error.message };
    }
}

export async function deleteProduct(productId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    try {
        const products = await query<any[]>(`
            SELECT p.*, d.vendorId 
            FROM \`product\` p 
            JOIN \`dispensary\` d ON p.dispensaryId = d.id 
            WHERE p.id = ?
        `, [productId]);

        if (!products[0] || products[0].vendorId !== session.user.id) {
            return { error: "Product not found or access denied." };
        }

        await query('DELETE FROM `product` WHERE id = ?', [productId]);

        revalidatePath('/vendor/dashboard/products');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting product:", error);
        return { error: error.message };
    }
}

export async function addDispensary(data: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    try {
        const d = data;
        const id = crypto.randomUUID();
        const sql = `
            INSERT INTO \`dispensary\` (
                id, vendorId, name, slug, imageId, location, coordinates, rating, 
                reviews, type, offers, address, suburb, city, state, zipCode, 
                phone, website, hours, imageUrl, categoryIds, isFeatured,
                createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        await query(sql, [
            id, session.user.id, d.name, d.slug, d.imageId || null, d.location || null,
            JSON.stringify(d.coordinates || {}), d.rating || 0, d.reviews || 0, d.type || null,
            JSON.stringify(d.offers || []), d.address || null, d.suburb || null, d.city || null,
            d.state || null, d.zipCode || null, d.phone || null, d.website || null,
            JSON.stringify(d.hours || []), d.imageUrl || null, JSON.stringify(d.categoryIds || []),
            d.isFeatured ? 1 : 0
        ]);

        revalidatePath('/vendor/dashboard/stores');
        return { success: true, id };
    } catch (error: any) {
        console.error("Error adding dispensary:", error);
        return { error: error.message };
    }
}

export async function updateDispensary(dispensaryId: string, data: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    try {
        const dispensaries = await query<any[]>('SELECT vendorId FROM `dispensary` WHERE id = ?', [dispensaryId]);
        if (!dispensaries[0] || dispensaries[0].vendorId !== session.user.id) {
            return { error: "Dispensary not found or access denied." };
        }

        const d = data;
        const fields = [];
        const params = [];

        const allowedFields = [
            'name', 'slug', 'imageId', 'location', 'coordinates', 'rating', 'reviews',
            'type', 'offers', 'address', 'suburb', 'city', 'state', 'zipCode',
            'phone', 'website', 'hours', 'imageUrl', 'categoryIds', 'isFeatured'
        ];

        for (const field of allowedFields) {
            if (field in d) {
                fields.push(`${field} = ?`);
                let val = d[field];
                if (['coordinates', 'offers', 'hours', 'categoryIds'].includes(field)) {
                    val = JSON.stringify(val);
                } else if (field === 'isFeatured') {
                    val = val ? 1 : 0;
                }
                params.push(val);
            }
        }

        if (fields.length === 0) return { success: true };

        const sql = `UPDATE \`dispensary\` SET ${fields.join(', ')}, updatedAt = NOW() WHERE id = ?`;
        params.push(dispensaryId);

        await query(sql, params);

        revalidatePath('/vendor/dashboard/stores');
        revalidatePath(`/vendor/dashboard/store/${dispensaryId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating dispensary:", error);
        return { error: error.message };
    }
}

export async function getDispensary(dispensaryId: string) {
    const session = await auth();
    if (!session?.user?.id) return null;

    try {
        const dispensaries = await query<any[]>('SELECT * FROM `dispensary` WHERE id = ?', [dispensaryId]);
        const dispensary = dispensaries[0];

        if (!dispensary || dispensary.vendorId !== session.user.id) {
            return null;
        }

        return mapDispensary(dispensary);
    } catch (error) {
        console.error("Error fetching dispensary:", error);
        return null;
    }
}

export async function importProducts(dispensaryId: string, products: any[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [dispensaries]: any = await connection.execute('SELECT vendorId FROM `dispensary` WHERE id = ?', [dispensaryId]);
        if (!dispensaries[0] || dispensaries[0].vendorId !== session.user.id) {
            await connection.rollback();
            return { error: "Dispensary not found or access denied." };
        }

        for (const p of products) {
            const id = crypto.randomUUID();
            const sql = `
                INSERT INTO \`product\` (
                    id, dispensaryId, name, slug, description, type, strain, thc, cbd, 
                    price, weight, pricing, ediblePricing, sodaPricing, imageId, 
                    imageUrl, additionalImageUrls, stock, isFeatured, isHotDeal, salePrice,
                    effectsLength, benefits, flavour, ingredients,
                    createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;

            await connection.execute(sql, [
                id, dispensaryId, p.name, p.slug || null, p.description || null, p.type, p.strain || null, p.thc || null, p.cbd || null,
                p.price || null, p.weight || null, JSON.stringify(p.pricing || []), JSON.stringify(p.ediblePricing || []),
                JSON.stringify(p.sodaPricing || []), p.imageId, p.imageUrl || null, JSON.stringify(p.additionalImageUrls || []),
                p.stock || 0, p.isFeatured ? 1 : 0, p.isHotDeal ? 1 : 0, p.salePrice || null,
                p.effectsLength || null, p.benefits || null, p.flavour || null, p.ingredients || null
            ]);
        }

        await connection.commit();
        revalidatePath('/vendor/dashboard/products');
        return { success: true, count: products.length };
    } catch (error: any) {
        await connection.rollback();
        console.error("Error importing products:", error);
        return { error: error.message };
    } finally {
        connection.release();
    }
}
