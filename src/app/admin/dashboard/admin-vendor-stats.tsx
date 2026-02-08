'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserCountByRole } from '@/lib/actions/admin-actions';

export default function AdminVendorStats() {
    const [vendorCount, setVendorCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchVendorCount = async () => {
            setIsLoading(true);
            try {
                const count = await getUserCountByRole('vendor');
                setVendorCount(count);
            } catch (error) {
                console.error("Error fetching vendor count:", error);
                setVendorCount(0);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVendorCount();
    }, []);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                ) : (
                    <div className="text-2xl font-bold">{vendorCount}</div>
                )}
                <p className="text-xs text-muted-foreground">Total registered vendors.</p>
            </CardContent>
        </Card>
    );
}
