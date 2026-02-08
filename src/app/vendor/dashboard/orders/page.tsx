'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Order } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { DollarSign, Truck, Percent, MoreHorizontal, XCircle, CheckCircle, Package, Clock, MapPin, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { getVendorOrders, updateOrderStatus, getVendorStats } from '@/lib/actions/vendor-actions';

const OrderRow = ({ order, onStatusUpdate }: { order: Order; onStatusUpdate: (orderId: string, newStatus: Order['status']) => void; }) => {
  const { toast } = useToast();
  const createdAtDate = new Date(order.createdAt as string);

  const vendorPayout = order.vendorPayout ?? 0;
  const deliveryFee = order.deliveryFee ?? 0;

  const handleStatusChange = async (newStatus: Order['status']) => {
    try {
      const result = await updateOrderStatus(order.id, newStatus);
      if (result.success) {
        toast({ title: "Order Status Updated", description: `Order moved to '${newStatus}'.` });
        onStatusUpdate(order.id, newStatus);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error("Failed to update order status:", err);
      toast({ variant: 'destructive', title: "Update Failed", description: err.message });
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="font-medium">{order.customerName}</div>
        <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          {order.items.map((item, idx) => (
            <span key={`${item.productId}-${idx}`} className="truncate max-w-xs">{item.name} (x{item.quantity})</span>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant={order.status === 'placed' ? 'secondary' : order.status === 'completed' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'outline'}
          className="capitalize"
        >
          {order.status}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">{format(createdAtDate, 'PPpp')}</TableCell>
      <TableCell className="text-right">
        <div className="font-semibold">R{vendorPayout.toFixed(2)}</div>
        <div className="text-xs text-muted-foreground">R{deliveryFee.toFixed(2)} Delivery</div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={!['placed', 'confirmed'].includes(order.status)}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {order.status === 'placed' && (
              <>
                <DropdownMenuItem onClick={() => handleStatusChange('confirmed')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Order
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('cancelled')} className="text-destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Order
                </DropdownMenuItem>
              </>
            )}
            {order.status === 'confirmed' && (
              <DropdownMenuItem onClick={() => handleStatusChange('ready-for-pickup')}>
                <Package className="mr-2 h-4 w-4" />
                Ready for Pickup
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default function OrdersPage() {
  const { status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('recent');

  const onRouteOrders = useMemo(() => {
    return orders.filter(o => ['on-route', 'arrived'].includes(o.status));
  }, [orders]);

  const recentOrders = useMemo(() => {
    return orders.filter(o => !['on-route', 'arrived'].includes(o.status));
  }, [orders]);

  // Handle automatic tab switch when an order moves to "on-route"
  useEffect(() => {
    if (onRouteOrders.length > 0 && activeTab === 'recent') {
      // Check if any order JUST became on-route (optional refinement, but for now simple check)
      // Actually, user said: "When driver clicks arrived at vendor, The vendor, redirect to a tab called on route"
      // So if there's an order on-route, we should show it.
      setActiveTab('on-route');
    }
  }, [onRouteOrders, activeTab]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const [fetchedOrders, fetchedStats] = await Promise.all([
          getVendorOrders(),
          getVendorStats()
        ]);
        // @ts-ignore
        setOrders(fetchedOrders);
        setStats(fetchedStats);
      } catch (e: any) {
        console.error("Error fetching data:", e);
        setError(e.message || "Failed to fetch orders.");
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status]);

  const handleStatusUpdate = (orderId: string, newStatus: Order['status']) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Orders</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">R{stats?.totalRevenue.toFixed(2) || '0.00'}</div>}
            <p className="text-xs text-muted-foreground">Your earnings after commission.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">budmaps Commission</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">R{stats?.totalCommission.toFixed(2) || '0.00'}</div>}
            <p className="text-xs text-muted-foreground">5.5% of total sales.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Fees Collected</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">R{stats?.totalDeliveryFees.toFixed(2) || '0.00'}</div>}
            <p className="text-xs text-muted-foreground">R50 per delivery.</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="recent" className="rounded-lg px-6">Recent Orders</TabsTrigger>
          <TabsTrigger value="on-route" className="rounded-lg px-6 flex items-center gap-2">
            On Route
            {onRouteOrders.length > 0 && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground text-[10px] px-1.5 h-4 min-w-4 rounded-full flex items-center justify-center border-none">
                {onRouteOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-6 pt-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                View and manage incoming orders from customers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-right">Your Payout</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-destructive">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : recentOrders.length > 0 ? (
                    recentOrders.map((order) => <OrderRow key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />)
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No recent orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="on-route" className="space-y-6 pt-2">
          {onRouteOrders.length > 0 ? (
            <div className="grid gap-6">
              {onRouteOrders.map((order) => {
                // Mock distance and ETA
                const distance = (Math.random() * 5 + 1).toFixed(1);
                const eta = (parseFloat(distance) * 3).toFixed(0);

                return (
                  <Card key={order.id} className="overflow-hidden border-primary/20 shadow-md">
                    <div className="bg-primary/5 p-4 border-b border-primary/10 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary p-2 rounded-lg text-primary-foreground">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold">Order #{order.id.substring(0, 8)}</p>
                          <p className="text-xs text-muted-foreground capitalize">{order.status.replace('-', ' ')}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        R{order.vendorPayout.toFixed(2)}
                      </Badge>
                    </div>
                    <CardContent className="p-6">
                      <div className="grid md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Order Tracking</p>
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-4 h-4 rounded-full bg-green-500" />
                              <div className="w-0.5 h-10 bg-muted" />
                              <div className={cn("w-4 h-4 rounded-full", order.status === 'arrived' ? "bg-green-500" : "bg-muted")} />
                            </div>
                            <div className="space-y-7 -mt-1">
                              <div>
                                <p className="text-sm font-bold">Dispensary</p>
                                <p className="text-xs text-muted-foreground">Picked up by driver</p>
                              </div>
                              <div>
                                <p className="text-sm font-bold">{order.customerName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {order.status === 'arrived' ? 'Driver has arrived at destination' : 'Driver is on the way'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Customer Info</p>
                          <div className="space-y-1">
                            <p className="font-bold flex items-center gap-2">
                              {order.customerName}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {order.address}, {order.city}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-primary font-bold">
                              <Navigation className="h-4 w-4" />
                              Distance
                            </div>
                            <span className="font-black text-xl">{distance} km</span>
                          </div>
                          <div className="flex justify-between items-center border-t pt-3">
                            <div className="flex items-center gap-2 text-muted-foreground font-medium">
                              <Clock className="h-4 w-4" />
                              Est. Arrival
                            </div>
                            <span className="font-bold">{eta} mins</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 bg-muted/30 rounded-3xl border-2 border-dashed">
              <Truck className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-xl font-bold text-muted-foreground">No orders are currently on route.</p>
              <p className="text-muted-foreground">Active deliveries will appear here with live tracking info.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div >
  );
}
