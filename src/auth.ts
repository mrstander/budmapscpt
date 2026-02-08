import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function getUser(email: string) {
    try {
        const users = await query<any[]>('SELECT * FROM `user` WHERE email = ?', [email]);
        return users[0] || null;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    session: { strategy: "jwt" },
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;

                    if (user.password) {
                        const passwordsMatch = await bcrypt.compare(password, user.password);
                        if (passwordsMatch) return user as any;
                    }
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
});
