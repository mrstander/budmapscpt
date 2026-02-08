'use server';

import { query } from "@/lib/db";
import pool from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";
import { CartItem, OrderItem } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import crypto from 'crypto';

const deliverySchema = z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'Zip code is required'),
});

type PlaceOrderParams = z.infer<typeof deliverySchema> & {
    cart: CartItem[];
    groupedByDispensary: Record<string, CartItem[]>;
};

const getPlaceholderImage = (id?: string) => {
    if (!id) {
        return { imageUrl: 'https://picsum.photos/seed/default/200/200', imageHint: 'placeholder' };
    }
    const image = PlaceHolderImages.find(p => p.id === id);
    if (!image) {
        return { imageUrl: 'https://picsum.photos/seed/default/200/200', imageHint: 'placeholder' };
    }
    return { imageUrl: image.imageUrl, imageHint: image.imageHint };
};

const serializeDate = (date: any): string | null => {
    if (!date) return null;
    return new Date(date).toISOString();
};

const mapOrder = (o: any) => ({
    ...o,
    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
    createdAt: serializeDate(o.createdAt),
    updatedAt: serializeDate(o.updatedAt),
    confirmedAt: serializeDate(o.confirmedAt),
    pickedUpAt: serializeDate(o.pickedUpAt),
    completedAt: serializeDate(o.completedAt),
});

export async function placeOrder(data: PlaceOrderParams) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "You must be logged in to place an order." };
    }

    const { address, city, state, zipCode, groupedByDispensary } = data;
    const userId = session.user.id;
    const userEmail = session.user.email || 'unknown@example.com';
    const userName = session.user.name || 'Anonymous';

    const DELIVERY_FEE = 50.00;
    const COMMISSION_RATE = 0.055;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const dispensarySlug in groupedByDispensary) {
            const items = groupedByDispensary[dispensarySlug];
            if (items.length === 0) continue;

            const dispensary = items[0].dispensary;
            const dispensaryId = dispensary.id;

            if (!dispensaryId) {
                throw new Error(`Dispensary ID missing for ${dispensary.name}`);
            }

            const subtotal = items.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
            const taxes = subtotal * 0.08;
            const commission = subtotal * COMMISSION_RATE;
            const vendorPayout = subtotal - commission;
            const total = subtotal + taxes + DELIVERY_FEE;

            const orderItems: OrderItem[] = items.map(cartItem => ({
                productId: cartItem.product.id,
                name: cartItem.product.name,
                weight: cartItem.product.weight || '',
                price: cartItem.product.price || 0,
                quantity: cartItem.quantity,
                imageUrl: cartItem.product.imageUrl || getPlaceholderImage(cartItem.product.imageId).imageUrl,
                imageHint: getPlaceholderImage(cartItem.product.imageId).imageHint,
            }));

            const orderId = crypto.randomUUID();
            const sql = `
                INSERT INTO \`order\` (
                    id, dispensaryId, customerId, dispensaryName, dispensaryState,
                    customerName, customerEmail, items, subtotal, taxes,
                    deliveryFee, commission, vendorPayout, total,
                    paymentMethod, status, address, city, state, zipCode,
                    createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cash', 'placed', ?, ?, ?, ?, NOW(), NOW())
            `;

            await connection.execute(sql, [
                orderId, dispensaryId, userId, dispensary.name, dispensary.state,
                userName, userEmail, JSON.stringify(orderItems), subtotal, taxes,
                DELIVERY_FEE, commission, vendorPayout, total,
                address, city, state, zipCode
            ]);
        }

        await connection.commit();
        return { success: true };

    } catch (error: any) {
        await connection.rollback();
        console.error("Error creating orders:", error);
        return { error: error.message || "Failed to place order." };
    } finally {
        connection.release();
    }
}

export async function getUserOrders() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }
    const userId = session.user.id;

    try {
        const orders = await query<any[]>(`
            SELECT * FROM \`order\` 
            WHERE customerId = ? 
            ORDER BY createdAt DESC
        `, [userId]);

        return orders.map(mapOrder);
    } catch (error) {
        console.error("Error fetching user orders:", error);
        return [];
    }
}
