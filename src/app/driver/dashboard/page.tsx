'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Truck, Wallet, Navigation, CheckCircle2, Power, MapPin, Package, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from 'next-auth/react';
import { getAvailableDeliveriesStats, getCompletedDeliveriesStats, getDriverStatus, toggleDriverStatus, getDriverMonthlyEarnings, getActiveDeliveriesStats } from '@/lib/actions/driver-actions';
import { format } from 'date-fns';

function AvailableDeliveriesStats() {
  const [stats, setStats] = useState({ count: 0, totalEarnings: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAvailableDeliveries = async () => {
      setIsLoading(true);
      try {
        const data = await getAvailableDeliveriesStats();
        setStats(data);
      } catch (error) {
        console.error("Error fetching available deliveries stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableDeliveries();

    // Poll every 30 seconds
    const interval = setInterval(fetchAvailableDeliveries, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    count: isLoading ? <Skeleton className="h-10 w-16" /> : stats.count,
    earnings: isLoading ? <Skeleton className="h-10 w-32" /> : `R${stats.totalEarnings.toFixed(2)}`
  };
}

function CompletedDeliveriesStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({ count: 0, totalEarnings: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    const fetchCompletedDeliveries = async () => {
      setIsLoading(true);
      try {
        const data = await getCompletedDeliveriesStats();
        setStats(data);
      } catch (error) {
        console.error("Error fetching completed deliveries stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompletedDeliveries();
  }, [session]);

  return {
    count: isLoading ? <Skeleton className="h-10 w-16" /> : stats.count,
    earnings: isLoading ? <Skeleton className="h-10 w-32" /> : `R${stats.totalEarnings.toFixed(2)}`
  };
}

function ActiveDeliveriesStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({ count: 0, totalEarnings: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    const fetchActiveDeliveries = async () => {
      setIsLoading(true);
      try {
        const data = await getActiveDeliveriesStats();
        setStats(data);
      } catch (error) {
        console.error("Error fetching active deliveries stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveDeliveries();

    // Poll every 30 seconds for active delivery updates
    const interval = setInterval(fetchActiveDeliveries, 30000);
    return () => clearInterval(interval);
  }, [session]);

  return {
    count: isLoading ? <Skeleton className="h-10 w-16" /> : stats.count,
    earnings: isLoading ? <Skeleton className="h-10 w-32" /> : `R${stats.totalEarnings.toFixed(2)}`
  };
}


const DriverStatusToggle = ({ isOnline, onToggle }: { isOnline: boolean, onToggle: (checked: boolean) => void }) => {
  return (
    <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm border rounded-full px-4 py-2 shadow-sm">
      <div className={cn(
        "w-2 h-2 rounded-full",
        isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
      )} />
      <span className="text-sm font-bold uppercase tracking-tight">
        {isOnline ? "Online" : "Offline"}
      </span>
      <Switch
        id="driver-status"
        checked={isOnline}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-green-500"
      />
    </div>
  );
};


export default function DriverDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const availableStats = AvailableDeliveriesStats();
  const completedStats = CompletedDeliveriesStats();
  const activeStats = ActiveDeliveriesStats();
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(false);
  const [monthlyEarnings, setMonthlyEarnings] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    const fetchActive = async () => {
      if (!session?.user) return;
      setIsLoadingActive(true);
      try {
        const orders = await getDriverOrders();
        const active = orders.filter((o: any) =>
          ['out-for-delivery', 'on-route', 'arrived'].includes(o.status)
        );
        setActiveOrders(active);
      } catch (error) {
        console.error("Error fetching active orders:", error);
      } finally {
        setIsLoadingActive(false);
      }
    };
    fetchActive();
    const interval = setInterval(fetchActive, 10000); // More frequent for active tasks
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!session?.user) return;
      setIsHistoryLoading(true);
      try {
        const data = await getDriverMonthlyEarnings();
        setMonthlyEarnings(data);
      } catch (error) {
        console.error("Error fetching earnings history:", error);
      } finally {
        setIsHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [session]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user) return;
    const fetchStatus = async () => {
      const driver = await getDriverStatus();
      if (driver) {
        setIsOnline(driver.availabilityStatus === 'online');
      }
    }
    fetchStatus();
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto space-y-10 py-6">
        <Skeleton className="h-20 w-1/2" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
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


  const handleStatusChange = async (online: boolean) => {
    if (!session?.user) return;

    const newStatus = online ? 'online' : 'offline';
    try {
      setIsOnline(online); // Optimistic update
      const result = await toggleDriverStatus(newStatus);
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: online ? 'You are now Online' : 'You are now Offline',
        description: online ? 'Ready to accept new delivery requests!' : 'Checking out for now.',
      });
    } catch (error: any) {
      setIsOnline(!online); // Revert optimistic update
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-2">Driver Dashboard</h1>
          <p className="text-muted-foreground text-lg">Your delivery hub and earnings overview.</p>
        </div>
        <DriverStatusToggle isOnline={isOnline} onToggle={handleStatusChange} />
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg px-6">Overview</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg px-6">Earnings History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Available Deliveries Card */}
            <Card className="rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Available Deliveries</CardTitle>
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <Truck className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-6xl font-black mb-2 tracking-tighter">
                  {availableStats.count}
                </div>
                <p className="text-sm text-muted-foreground font-medium">Orders ready for pickup</p>
              </CardContent>
            </Card>

            {/* Active Deliveries Card */}
            <Card className="rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-2 border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Deliveries</CardTitle>
                <div className="bg-blue-500/10 p-2 rounded-lg text-blue-600">
                  <Navigation className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-6xl font-black mb-2 tracking-tighter text-blue-600">
                  {activeStats.count}
                </div>
                <p className="text-sm text-muted-foreground font-medium">Orders currently on route</p>
              </CardContent>
            </Card>

            {/* Potential Earnings Card */}
            <Card className="rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Potential Earnings</CardTitle>
                <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-600">
                  <Wallet className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black mb-2 tracking-tighter whitespace-nowrap">
                  {availableStats.earnings}
                </div>
                <p className="text-sm text-muted-foreground font-medium">From available orders</p>
              </CardContent>
            </Card>

            {/* Completed Earnings Card */}
            <Card className="rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Completed Delivery Earnings</CardTitle>
                <div className="bg-green-500/10 p-2 rounded-lg text-green-600">
                  <Wallet className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black mb-2 tracking-tighter whitespace-nowrap">
                  {completedStats.earnings}
                </div>
                <p className="text-sm text-muted-foreground font-medium">From all completed deliveries.</p>
              </CardContent>
            </Card>
          </div>

          {activeOrders.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Truck className="h-6 w-6 text-blue-600" />
                Current Active Deliveries
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeOrders.map((order) => (
                  <Card key={order.id} className="rounded-2xl border-none shadow-md bg-white overflow-hidden border-l-4 border-l-blue-500">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <Badge className={cn(
                            "mb-2 uppercase tracking-tight text-[10px] font-bold",
                            order.status === 'on-route' ? "bg-blue-100 text-blue-700" :
                              order.status === 'arrived' ? "bg-green-100 text-green-700" :
                                "bg-yellow-100 text-yellow-700"
                          )}>
                            {order.status.replace('-', ' ')}
                          </Badge>
                          <h3 className="text-xl font-black tracking-tight">Order #{order.id.substring(0, 8)}</h3>
                          <p className="text-muted-foreground text-sm">{order.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground font-bold uppercase">Payout</p>
                          <p className="text-lg font-black text-green-600">R{order.deliveryFee.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">{order.address}, {order.city}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{order.items.length} items from {order.dispensaryName}</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => router.push('/driver/dashboard/deliveries')}
                        variant="outline"
                        className="w-full rounded-xl font-bold border-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                      >
                        Update Status
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Navigation className="h-6 w-6 text-primary" />
                Getting Started
              </h2>
              <div className="grid gap-4">
                {[
                  { title: "Go Online", desc: "Toggle your status to 'Online' to start appearing for new order requests.", icon: Power },
                  { title: "Check My Deliveries", desc: "Navigate to the 'My Deliveries' section to browse and accept available orders.", icon: Package },
                  { title: "Pick up & Deliver", desc: "Head to the dispensary, pick up the items, and deliver them to our happy customers!", icon: MapPin }
                ].map((step, i) => (
                  <div key={i} className="group flex gap-5 bg-card border border-border/50 p-6 rounded-2xl hover:border-primary/50 transition-colors shadow-sm">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black text-xl group-hover:bg-primary group-hover:text-white transition-colors">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-lg mb-1">{step.title}</p>
                      <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-primary" />
                Delivery Requirements
              </h2>
              <div className="bg-card border border-border/50 p-8 rounded-2xl space-y-6 shadow-sm">
                {[
                  "Always verify customer ID upon delivery to ensure they are of legal age.",
                  "Maintain a clean and professional appearance as a representative of Budmaps.",
                  "Double check all items against the order list before leaving the dispensary.",
                  "Contact support immediately if you encounter any issues during delivery."
                ].map((req, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                    <p className="text-lg leading-snug">{req}</p>
                  </div>
                ))}

                <div className="mt-8 pt-6 border-t font-semibold text-primary flex justify-between items-center">
                  <span>Need Help?</span>
                  <Button variant="link" className="font-bold">Contact Support</Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-8">
          {isHistoryLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ) : monthlyEarnings.length > 0 ? (
            <div className="space-y-10">
              {monthlyEarnings.map((monthData) => (
                <div key={monthData.month} className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="text-2xl font-black tracking-tight">{monthData.monthName} {monthData.year}</h3>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Monthly Total</p>
                      <p className="text-3xl font-black text-green-600">R{monthData.totalEarnings.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {monthData.orders.map((order: any) => (
                      <Card key={order.id} className="rounded-xl border border-border/50 shadow-sm hover:border-primary/30 transition-colors p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-lg">Order #{order.id.substring(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">{order.customerName}</p>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            + R{order.deliveryFee.toFixed(2)}
                          </Badge>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-4">
                          <Clock className="w-3 h-3 mr-1" />
                          {order.completedAt ? format(new Date(order.completedAt), 'PPP p') : 'Pending'}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 bg-muted/30 rounded-3xl border-2 border-dashed">
              <Wallet className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-xl font-bold text-muted-foreground">No earnings history found yet.</p>
              <p className="text-muted-foreground">Complete your first delivery to start earning!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
