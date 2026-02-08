'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, MapPin, User, LogOut, Truck } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { CartProvider } from '@/context/cart-context';
import { useSession, signOut } from 'next-auth/react';
import DriverBottomNav from './driver-bottom-nav';
import { toggleDriverStatus } from '@/lib/actions/driver-actions';
import { toast } from '@/hooks/use-toast';

const navItems = [
  { href: '/driver/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/driver/dashboard/deliveries', icon: Truck, label: 'My Deliveries' },
];

function DriverLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await toggleDriverStatus('offline');
    } catch (error) {
      console.error("Failed to set driver status to offline on logout:", error);
    }
    await signOut({ redirect: false });
    router.push('/');
    toast({ title: "Logged out", description: "You have been logged out successfully." });
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/" className="flex items-center space-x-2">
            <MapPin className="h-8 w-8 text-primary" />
            <span className="font-bold text-lg">budmaps</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <User />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{session?.user?.email}</p>
              <p className="text-xs text-muted-foreground">Driver Account</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">{children}</main>
        <DriverBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}


export default function DriverDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <DriverLayoutContent>{children}</DriverLayoutContent>
    </CartProvider>
  );
}
