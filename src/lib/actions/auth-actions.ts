'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { query } from '@/lib/db';
import getPool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';
import { slugify } from '@/lib/utils';

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['user', 'vendor', 'driver']).optional(),
    name: z.string().optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zipCode: z.string().optional().nullable(),
});

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        const rawFormData = Object.fromEntries(formData.entries());
        const session = await signIn('credentials', {
            ...rawFormData,
            redirect: false,
        });

        // Fetch user again to get the role if signIn was successful
        // Note: in a more complex setup, we might get this from the session/token directly
        const user = await query<any[]>('SELECT role FROM `user` WHERE email = ?', [rawFormData.email as string]);
        return { success: true, role: user[0]?.role || 'user' };
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

export async function register(formData: FormData) {
    const validatedFields = formSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role') || 'user',
        name: formData.get('name'),
        phoneNumber: formData.get('phoneNumber'),
        address: formData.get('address'),
        city: formData.get('city'),
        state: formData.get('state'),
        zipCode: formData.get('zipCode'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Register.',
        };
    }

    const { email, password, role, name, phoneNumber, address, city, state, zipCode } = validatedFields.data;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = crypto.randomUUID();

        const connection = await getPool().getConnection();
        try {
            await connection.beginTransaction();

            // Create User
            await connection.execute(`
                INSERT INTO \`user\` (id, email, password, role, name, phoneNumber, address, city, state, zipCode, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [id, email, hashedPassword, role, name ?? null, phoneNumber ?? null, address ?? null, city ?? null, state ?? null, zipCode ?? null]);

            // If vendor, create a default store
            if (role === 'vendor') {
                const dispensaryId = crypto.randomUUID();
                const slug = slugify(name || 'My Store');

                await connection.execute(`
                    INSERT INTO \`dispensary\` (
                        id, vendorId, name, slug, address, city, state, zipCode, phone, createdAt, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `, [
                    dispensaryId,
                    id,
                    name || 'My Store',
                    slug,
                    address ?? null,
                    city ?? null,
                    state ?? null,
                    zipCode ?? null,
                    phoneNumber ?? null
                ]);
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error: any) {
        console.error("Registration error:", error);
        return {
            message: error.code === 'ER_DUP_ENTRY' ? 'User already exists.' : 'Database Error: Failed to Create User.',
        };
    }

    // Auto login after registration
    return authenticate(undefined, formData);
}
