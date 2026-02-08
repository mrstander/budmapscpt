'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Dispensary } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import AddStoreForm from './add-store-form';
import { useSession } from 'next-auth/react';
import { getVendorDispensaries } from '@/lib/actions/vendor-actions';

export default function StoresPage() {
    const { status } = useSession();
    const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getVendorDispensaries();
                // @ts-ignore
                setDispensaries(data);
            } catch (err: any) {
                console.error("Error fetching dispensaries:", err);
                setError(err.message);
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

    const StoreRow = ({ store }: { store: Dispensary }) => (
        <TableRow>
            <TableCell className="font-medium">{store.name}</TableCell>
            <TableCell>{store.city}, {store.state}</TableCell>
            <TableCell className="hidden md:table-cell">{store.phone}</TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem asChild>
                            <Link href={`/vendor/dashboard/store/${store.id}`}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">My Stores</h1>

            <Tabs defaultValue="stores" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="stores">All Stores</TabsTrigger>
                    <TabsTrigger value="add">Add New Store</TabsTrigger>
                </TabsList>
                <TabsContent value="stores">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Dispensaries</CardTitle>
                            <CardDescription>
                                A list of all your store locations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Store Name</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead className="hidden md:table-cell">Phone</TableHead>
                                        <TableHead className="w-[50px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={4}>
                                                    <Skeleton className="h-5 w-full" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : error ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-destructive">
                                                {error}
                                            </TableCell>
                                        </TableRow>
                                    ) : dispensaries && dispensaries.length > 0 ? (
                                        dispensaries.map((store) => <StoreRow key={store.id} store={store} />)
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">
                                                You haven't added any stores yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="add">
                    <AddStoreForm />
                </TabsContent>
            </Tabs>
        </div>
    );
}
