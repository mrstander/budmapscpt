import { NextResponse } from 'next/server';
import { register } from '@/lib/actions/auth-actions';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const formData = new FormData();
        Object.entries(body).forEach(([key, value]) => {
            formData.append(key, value as string);
        });

        const result = await register(formData);

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message || 'Registration failed' },
            { status: 500 }
        );
    }
}
