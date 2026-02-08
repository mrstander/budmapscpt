'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserCountByRole } from '@/lib/actions/admin-actions';

export default function AdminUserStats() {
    const [userCount, setUserCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserCount = async () => {
            setIsLoading(true);
            try {
                const count = await getUserCountByRole('user');
                setUserCount(count);
            } catch (error) {
                console.error("Error fetching user count:", error);
                setUserCount(0);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserCount();
    }, []);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                ) : (
                    <div className="text-2xl font-bold">{userCount}</div>
                )}
                <p className="text-xs text-muted-foreground">Total registered users.</p>
            </CardContent>
        </Card>
    );
}
