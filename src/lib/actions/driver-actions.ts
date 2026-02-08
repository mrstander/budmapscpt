'use server';

import { revalidatePath } from "next/cache";

import { query } from "@/lib/db";
import { auth } from "@/auth";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
    arrivedAt: serializeDate(o.arrivedAt),
});

export async function registerDriver(data: any) {
    try {
        const { email, password, state, city } = data;

        const users = await query<any[]>('SELECT id FROM `user` WHERE email = ?', [email]);
        if (users.length > 0) {
            return { error: "User already exists." };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();

        await query(`
            INSERT INTO \`user\` (id, email, password, role, createdAt, updatedAt)
            VALUES (?, ?, ?, 'driver', NOW(), NOW())
        `, [userId, email, hashedPassword]);

        const driverId = crypto.randomUUID();
        await query(`
            INSERT INTO \`driver\` (id, userId, state, city, availabilityStatus, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 'offline', NOW(), NOW())
        `, [driverId, userId, state, city]);

        return { success: true };

    } catch (error: any) {
        console.error("Error registering driver:", error);
        return { error: error.message };
    }
}

export async function getAvailableDeliveriesStats() {
    try {
        const rows = await query<any[]>(`
            SELECT deliveryFee FROM \`order\` 
            WHERE status IN ('ready-for-pickup', 'confirmed')
        `);

        let totalEarnings = 0;
        rows.forEach(order => {
            totalEarnings += order.deliveryFee || 0;
        });

        return {
            count: rows.length,
            totalEarnings
        };

    } catch (error) {
        console.error("Error fetching available deliveries stats:", error);
        return { count: 0, totalEarnings: 0 };
    }
}

export async function getCompletedDeliveriesStats() {
    const session = await auth();
    if (!session?.user?.id) {
        return { count: 0, totalEarnings: 0 };
    }
    const userId = session.user.id;

    try {
        const drivers = await query<any[]>('SELECT id FROM `driver` WHERE userId = ?', [userId]);
        const driver = drivers[0];

        if (!driver) {
            return { count: 0, totalEarnings: 0 };
        }

        const completedOrders = await query<any[]>(`
            SELECT deliveryFee FROM \`order\` 
            WHERE status = 'completed' AND driverId = ?
        `, [driver.id]);

        let totalEarnings = 0;
        completedOrders.forEach(order => {
            totalEarnings += order.deliveryFee || 0;
        });

        return {
            count: completedOrders.length,
            totalEarnings
        };

    } catch (error) {
        console.error("Error fetching completed deliveries stats:", error);
        return { count: 0, totalEarnings: 0 };
    }
}

export async function getActiveDeliveriesStats() {
    const session = await auth();
    if (!session?.user?.id) {
        return { count: 0, totalEarnings: 0 };
    }
    const userId = session.user.id;

    try {
        const drivers = await query<any[]>('SELECT id FROM `driver` WHERE userId = ?', [userId]);
        const driver = drivers[0];

        if (!driver) {
            return { count: 0, totalEarnings: 0 };
        }

        const activeOrders = await query<any[]>(`
            SELECT deliveryFee FROM \`order\` 
            WHERE status IN ('out-for-delivery', 'on-route', 'arrived') AND driverId = ?
        `, [driver.id]);

        let totalEarnings = 0;
        activeOrders.forEach(order => {
            totalEarnings += order.deliveryFee || 0;
        });

        return {
            count: activeOrders.length,
            totalEarnings
        };

    } catch (error) {
        console.error("Error fetching active deliveries stats:", error);
        return { count: 0, totalEarnings: 0 };
    }
}


export async function getDriverStatus() {
    const session = await auth();
    if (!session?.user?.id) return null;

    try {
        const drivers = await query<any[]>('SELECT * FROM `driver` WHERE userId = ?', [session.user.id]);
        return drivers[0] || null;
    } catch (error) {
        console.error("Error fetching driver status:", error);
        return null;
    }
}


export async function toggleDriverStatus(status: 'online' | 'offline') {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Not authenticated" };
    }

    try {
        console.log(`Toggling driver status for user ${session.user.id} to ${status}`);
        const drivers = await query<any[]>('SELECT id FROM `driver` WHERE userId = ?', [session.user.id]);
        const driver = drivers[0];

        if (!driver) {
            const id = crypto.randomUUID();
            await query(`
                INSERT INTO \`driver\` (id, userId, availabilityStatus, city, state, createdAt, updatedAt)
                VALUES (?, ?, ?, 'Unknown', 'Unknown', NOW(), NOW())
            `, [id, session.user.id, status]);
        } else {
            await query(`
                UPDATE \`driver\` SET availabilityStatus = ?, updatedAt = NOW() WHERE id = ?
            `, [status, driver.id]);
        }

        revalidatePath('/driver/dashboard');
        return { success: true };

    } catch (error: any) {
        console.error("Error toggling driver status for user", session.user.id, ":", error);
        return { error: error.message };
    }
}

export async function forceAllDriversOnline() {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
        return { error: "Access denied. Admin only." };
    }

    try {
        await query("UPDATE `driver` SET availabilityStatus = 'online', updatedAt = NOW()");
        revalidatePath('/driver/dashboard');
        revalidatePath('/admin/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error("Error forcing all drivers online:", error);
        return { error: error.message };
    }
}

export async function getDriverOrders() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const drivers = await query<any[]>('SELECT id FROM `driver` WHERE userId = ?', [session.user.id]);
        const driver = drivers[0];

        // Fetch available orders
        const availableOrders = await query<any[]>(`
            SELECT * FROM \`order\` 
            WHERE status IN ('ready-for-pickup', 'confirmed') 
            ORDER BY createdAt DESC
        `);

        // Fetch orders assigned to this driver
        let assignedOrders: any[] = [];
        if (driver) {
            assignedOrders = await query<any[]>(`
                SELECT * FROM \`order\` 
                WHERE driverId = ? 
                ORDER BY createdAt DESC
            `, [driver.id]);
        }

        // Combine unique orders
        const allOrders = [...availableOrders, ...assignedOrders];
        const uniqueOrders = Array.from(new Map(allOrders.map(o => [o.id, o])).values());

        return uniqueOrders.map(mapOrder);

    } catch (error) {
        console.error("Error fetching driver orders:", error);
        return [];
    }
}

export async function acceptOrder(orderId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    try {
        let drivers = await query<any[]>('SELECT id FROM `driver` WHERE userId = ?', [session.user.id]);
        let driver = drivers[0];

        if (!driver) {
            const id = crypto.randomUUID();
            await query(`
                INSERT INTO \`driver\` (id, userId, availabilityStatus, city, state, createdAt, updatedAt)
                VALUES (?, ?, 'online', 'Unknown', 'Unknown', NOW(), NOW())
            `, [id, session.user.id]);
            driver = { id };
        }

        await query(`
            UPDATE \`order\` 
            SET status = 'out-for-delivery', driverId = ?, pickedUpAt = NOW(), updatedAt = NOW() 
            WHERE id = ?
        `, [driver.id, orderId]);

        return { success: true };
    } catch (error: any) {
        console.error("Error accepting order:", error);
        return { error: error.message };
    }
}

export async function arriveAtVendor(orderId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    try {
        await query(`
            UPDATE \`order\` 
            SET status = 'on-route', updatedAt = NOW() 
            WHERE id = ?
        `, [orderId]);
        revalidatePath('/driver/dashboard/deliveries');
        return { success: true };
    } catch (error: any) {
        console.error("Error arriving at vendor:", error);
        return { error: error.message };
    }
}

export async function arriveAtCustomer(orderId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    try {
        await query(`
            UPDATE \`order\` 
            SET status = 'arrived', arrivedAt = NOW(), updatedAt = NOW() 
            WHERE id = ?
        `, [orderId]);
        revalidatePath('/driver/dashboard/deliveries');
        return { success: true };
    } catch (error: any) {
        console.error("Error arriving at customer:", error);
        return { error: error.message };
    }
}

export async function completeOrder(orderId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    try {
        await query(`
            UPDATE \`order\` 
            SET status = 'completed', completedAt = NOW(), updatedAt = NOW() 
            WHERE id = ?
        `, [orderId]);
        revalidatePath('/driver/dashboard/deliveries');
        revalidatePath('/driver/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error("Error completing order:", error);
        return { error: error.message };
    }
}

export async function getDriverMonthlyEarnings() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const drivers = await query<any[]>('SELECT id FROM `driver` WHERE userId = ?', [session.user.id]);
        const driver = drivers[0];

        if (!driver) return [];

        const orders = await query<any[]>(`
            SELECT id, total, deliveryFee, completedAt, status, customerName
            FROM \`order\` 
            WHERE driverId = ? AND status = 'completed'
            ORDER BY completedAt DESC
        `, [driver.id]);

        const monthlyData: Record<string, { month: string, year: number, monthName: string, totalEarnings: number, orderCount: number, orders: any[] }> = {};

        orders.forEach(order => {
            const date = new Date(order.completedAt);
            const month = date.getMonth();
            const year = date.getFullYear();
            const key = `${year}-${month}`;

            if (!monthlyData[key]) {
                monthlyData[key] = {
                    month: key,
                    year,
                    monthName: date.toLocaleString('default', { month: 'long' }),
                    totalEarnings: 0,
                    orderCount: 0,
                    orders: []
                };
            }

            monthlyData[key].totalEarnings += order.deliveryFee || 0;
            monthlyData[key].orderCount += 1;
            monthlyData[key].orders.push({
                ...order,
                completedAt: serializeDate(order.completedAt)
            });
        });

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        return Object.values(monthlyData).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return months.indexOf(b.monthName) - months.indexOf(a.monthName);
        });

    } catch (error) {
        console.error("Error fetching driver monthly earnings:", error);
        return [];
    }
}

