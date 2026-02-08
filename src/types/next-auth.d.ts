import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's role. */
            role: 'user' | 'vendor' | 'admin' | 'driver';
            id: string;
        } & DefaultSession["user"]
    }

    interface User {
        role: 'user' | 'vendor' | 'admin' | 'driver';
    }
}

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        role: 'user' | 'vendor' | 'admin' | 'driver';
        sub: string;
    }
}
