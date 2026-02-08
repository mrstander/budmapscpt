'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Order } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Check, Package, Clock, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { getDriverOrders, acceptOrder, completeOrder, getDriverStatus, arriveAtVendor, arriveAtCustomer } from '@/lib/actions/driver-actions';
import { Driver } from '@/lib/types';

const DeliveryCard = ({ order, onOrderUpdate, driverProfileId }: { order: Order, onOrderUpdate: () => void, driverProfileId?: string }) => {
    const { toast } = useToast();

    const handleAcceptDelivery = async () => {
        try {
            const result = await acceptOrder(order.id);
            if (result.success) {
                toast({ title: "Delivery Accepted!", description: `You are now delivering order #${order.id.substring(0, 5)}...` });
                onOrderUpdate();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error accepting delivery", description: error.message });
            console.error("Error accepting delivery:", error);
        }
    };

    const handleArrivedAtVendor = async () => {
        try {
            const result = await arriveAtVendor(order.id);
            if (result.success) {
                toast({ title: "Arrived at Vendor", description: "Collect the package from the dispensary." });
                onOrderUpdate();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    };

    const handleArrivedAtCustomer = async () => {
        try {
            const result = await arriveAtCustomer(order.id);
            if (result.success) {
                toast({ title: "Arrived at Customer", description: "Deliver the package to the customer." });
                onOrderUpdate();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    };

    const handleCompleteDelivery = async () => {
        try {
            const result = await completeOrder(order.id);
            if (result.success) {
                toast({ title: "Delivery Completed!", description: "Great job!" });
                onOrderUpdate();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error completing delivery", description: error.message });
        }
    };

    const getTimestampInfo = () => {
        switch (order.status) {
            case 'ready-for-pickup':
            case 'confirmed':
                return order.createdAt ? `Placed: ${format(new Date(order.createdAt), 'PPpp')}` : '';
            case 'out-for-delivery':
                return order.pickedUpAt ? `Accepted: ${format(new Date(order.pickedUpAt), 'PPpp')}` : '';
            case 'arrived':
            case 'completed':
                return order.completedAt ? `Completed: ${format(new Date(order.completedAt), 'PPpp')}` : '';
            default:
                return order.createdAt ? `Placed: ${format(new Date(order.createdAt), 'PPpp')}` : '';
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Order for {order.customerName}</span>
                    <Badge variant="secondary">{order.status}</Badge>
                </CardTitle>
                <CardDescription>From: {order.dispensaryName}</CardDescription>
                <div className="text-xs text-muted-foreground flex items-center pt-2">
                    <Clock className="w-3 h-3 mr-1.5" />
                    {getTimestampInfo()}
                </div>
            </CardHeader>
            <CardContent>
                <p className="font-semibold">Delivery Address:</p>
                <p>{order.address}, {order.city}, {order.state} {order.zipCode}</p>
                <p className="mt-2 font-semibold">Items:</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {order.items.map(item => (
                        <li key={item.productId}>{item.name} (x{item.quantity})</li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter className="flex justify-between">
                <div className="font-bold text-lg">Total: R{order.total.toFixed(2)} (Cash)</div>
                {order.status === 'ready-for-pickup' && (
                    <Button onClick={handleAcceptDelivery}>
                        <Truck className="mr-2 h-4 w-4" /> Accept Delivery
                    </Button>
                )}
                {order.status === 'out-for-delivery' && driverProfileId && order.driverId === driverProfileId && (
                    <Button onClick={handleArrivedAtVendor} variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-white">
                        <MapPin className="mr-2 h-4 w-4" /> Arrived at Vendor
                    </Button>
                )}
                {order.status === 'on-route' && driverProfileId && order.driverId === driverProfileId && (
                    <Button onClick={handleArrivedAtCustomer} variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">
                        <Truck className="mr-2 h-4 w-4" /> Arrived at Customer
                    </Button>
                )}
                {order.status === 'arrived' && driverProfileId && order.driverId === driverProfileId && (
                    <Button onClick={handleCompleteDelivery} variant="default" className="bg-green-600 hover:bg-green-700 text-white">
                        <Check className="mr-2 h-4 w-4" /> Complete Delivery
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

function DriverDeliveries({ onOrderUpdate, refreshKey }: { onOrderUpdate: () => void, refreshKey: number }) {
    const { data: session } = useSession();
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [driverProfile, setDriverProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // @ts-ignore
                const orders = await getDriverOrders();
                // @ts-ignore
                const driver = await getDriverStatus();
                // @ts-ignore
                setAllOrders(orders);
                setDriverProfile(driver);
            } catch (e: any) {
                console.error("Error fetching data:", e);
                setError(e);
            } finally {
                setIsLoading(false);
            }
        };

        if (session) {
            loadData();
        }
    }, [session, refreshKey]);

    const activeDeliveries = useMemo(() => {
        if (!driverProfile) return [];
        return allOrders.filter(order =>
            ['out-for-delivery', 'on-route', 'arrived'].includes(order.status) &&
            order.driverId === driverProfile.id
        );
    }, [allOrders, driverProfile]);

    const availableOrders = useMemo(() => {
        // Available for pickup: ready-for-pickup (confirmed might be too early?)
        // The server action returns ready-for-pickup and confirmed.
        // Let's show ready-for-pickup.
        return allOrders.filter(order => order.status === 'ready-for-pickup').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [allOrders]);

    const pastDeliveries = useMemo(() => {
        if (!driverProfile) return [];
        return allOrders.filter(order => (order.status === 'completed' || order.status === 'cancelled') && order.driverId === driverProfile.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allOrders, driverProfile]);


    const renderList = (title: string, deliveries: Order[], listIsLoading: boolean, listError: Error | null, emptyMessage: string, emptySubMessage: string) => (
        <div>
            <h2 className="text-2xl font-bold mb-4">{title}</h2>
            {listIsLoading && (
                <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            )}
            {listError && <p className="text-destructive">Error: {listError.message}</p>}
            {!listIsLoading && !listError && deliveries && deliveries.length > 0 ? (
                <div className="space-y-4">
                    {deliveries.map(order => <DeliveryCard key={order.id} order={order} onOrderUpdate={onOrderUpdate} driverProfileId={driverProfile?.id} />)}
                </div>
            ) : !listIsLoading && !listError && (
                <Card className="flex flex-col items-center justify-center p-8 text-center">
                    <Package className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <p className="font-semibold">{emptyMessage}</p>
                    <p className="text-sm text-muted-foreground">{emptySubMessage}</p>
                </Card>
            )}
        </div>
    );

    return (
        <div className="space-y-8">
            {renderList("Active Delivery", activeDeliveries, isLoading, error, "You have no active deliveries.", "Accept a delivery to see it here.")}
            {renderList(`Available for Pickup (${availableOrders.length})`, availableOrders, isLoading, error, "No deliveries available for pickup.", "Check back later for new opportunities.")}
            {renderList("Past Deliveries", pastDeliveries, isLoading, error, "You have no past deliveries.", "Completed deliveries will appear here.")}
        </div>
    );
}

export default function DeliveriesPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [refreshKey, setRefreshKey] = useState(0);

    const forceRefresh = () => setRefreshKey(prev => prev + 1);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="space-y-8">
                <h1 className="text-3xl font-bold mb-8">My Deliveries</h1>
                <Skeleton className="h-10 w-64" />
                <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return null; // Will redirect via useEffect
    }

    if (session?.user?.role !== 'driver' && session?.user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
                <p className="text-muted-foreground mb-6">This page is only accessible to drivers.</p>
                <Button onClick={() => router.push('/')}>Go Home</Button>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">My Deliveries</h1>
            <DriverDeliveries onOrderUpdate={forceRefresh} refreshKey={refreshKey} />
        </div>
    );
}
