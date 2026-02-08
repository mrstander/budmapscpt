'use server';

import { query } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";
import bcrypt from 'bcryptjs';
import { revalidatePath } from "next/cache";

const profileSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
});

const addressSchema = z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'Zip code is required'),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function getUserProfile() {
    const session = await auth();
    if (!session?.user?.id) return null;

    try {
        const rows = await query<any[]>('SELECT * FROM `user` WHERE id = ?', [session.user.id]);
        return rows[0] || null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

export async function updateProfileEmail(data: z.infer<typeof profileSchema>) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) return { error: "Invalid email" };

    try {
        // Check if email already exists
        const rows = await query<any[]>('SELECT id FROM `user` WHERE email = ?', [parsed.data.email]);
        const existing = rows[0];

        if (existing && existing.id !== session.user.id) {
            return { error: "Email is already in use by another account." };
        }

        await query('UPDATE `user` SET email = ?, updatedAt = NOW() WHERE id = ?', [parsed.data.email, session.user.id]);

        revalidatePath('/profile/settings');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating email:", error);
        return { error: "Failed to update email." };
    }
}

export async function updateProfileAddress(data: z.infer<typeof addressSchema>) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    const parsed = addressSchema.safeParse(data);
    if (!parsed.success) return { error: "Invalid address data" };

    try {
        await query(`
            UPDATE \`user\` 
            SET address = ?, city = ?, state = ?, zipCode = ?, updatedAt = NOW() 
            WHERE id = ?
        `, [parsed.data.address, parsed.data.city, parsed.data.state, parsed.data.zipCode, session.user.id]);

        revalidatePath('/profile/settings');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating address:", error);
        return { error: "Failed to update address." };
    }
}

export async function updatePassword(data: z.infer<typeof passwordSchema>) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    const parsed = passwordSchema.safeParse(data);
    if (!parsed.success) return { error: "Invalid password data" };

    try {
        const rows = await query<any[]>('SELECT password FROM `user` WHERE id = ?', [session.user.id]);
        const user = rows[0];

        if (!user || !user.password) {
            return { error: "User not found or no password set." };
        }

        const passwordsMatch = await bcrypt.compare(parsed.data.currentPassword, user.password);
        if (!passwordsMatch) {
            return { error: "Incorrect current password." };
        }

        const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);
        await query('UPDATE `user` SET password = ?, updatedAt = NOW() WHERE id = ?', [hashedPassword, session.user.id]);

        return { success: true };
    } catch (error: any) {
        console.error("Error updating password:", error);
        return { error: "Failed to update password." };
    }
}
