'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from 'next-auth/react';
import { getVendorStats } from '@/lib/actions/vendor-actions';

export default function VendorRevenueStats() {
    const { status } = useSession();
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const stats = await getVendorStats();
                if (stats) {
                    setTotalRevenue(stats.totalRevenue);
                }
            } catch (error) {
                console.error("Error fetching vendor revenue stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (status === 'authenticated') {
            fetchStats();
        } else if (status === 'unauthenticated') {
            setIsLoading(false);
        }
    }, [status]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue (Completed)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-8 w-32" />
                ) : (
                    <div className="text-2xl font-bold">R{totalRevenue.toFixed(2)}</div>
                )}
                <p className="text-xs text-muted-foreground">From all completed orders.</p>
            </CardContent>
        </Card>
    );
}
