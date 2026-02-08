'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from 'next-auth/react';
import { getVendorStats } from '@/lib/actions/vendor-actions';

export default function VendorProductStats() {
    const { status } = useSession();
    const [productCount, setProductCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const stats = await getVendorStats();
                if (stats) {
                    setProductCount(stats.productCount);
                }
            } catch (error) {
                console.error("Error fetching vendor product stats:", error);
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
                <CardTitle className="text-sm font-medium">Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                ) : (
                    <div className="text-2xl font-bold">{productCount}</div>
                )}
                <p className="text-xs text-muted-foreground">Live on storefront</p>
            </CardContent>
        </Card>
    );
}
