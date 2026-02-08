'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, Power } from 'lucide-react';
import { forceAllDriversOnline } from '@/lib/actions/driver-actions';
import { useToast } from '@/hooks/use-toast';

export default function DriverManagement() {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleForceOnline = async () => {
        setLoading(true);
        try {
            const result = await forceAllDriversOnline();
            if (result.success) {
                toast({
                    title: "Success",
                    description: "All drivers have been set to Online.",
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.message || "Failed to update driver status.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">Driver Management</CardTitle>
                    <CardDescription>Global controls for all drivers.</CardDescription>
                </div>
                <Truck className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">Force All Drivers Online</p>
                            <p className="text-xs text-muted-foreground">Sets status to 'online' for all drivers.</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleForceOnline}
                            disabled={loading}
                            className="bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/20"
                        >
                            <Power className="h-4 w-4 mr-2" />
                            {loading ? "Updating..." : "Force Online"}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
