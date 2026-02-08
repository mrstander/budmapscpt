'use client';

import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { getAllUsers } from '@/lib/actions/admin-actions';

const UserRow = ({ user }: { user: User }) => {
    const createdAtDate = new Date(user.createdAt);

    return (
        <TableRow>
            <TableCell className="font-medium">
                <div className="font-medium">{user.email}</div>
                <div className="text-sm text-muted-foreground">{user.id}</div>
            </TableCell>
            <TableCell>
                {user.phoneNumber || '-'}
            </TableCell>
            <TableCell>
                <Badge
                    variant={user.role === 'admin' ? 'destructive' : user.role === 'vendor' ? 'secondary' : 'outline'}
                    className="capitalize"
                >
                    {user.role}
                </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell">{format(createdAtDate, 'PPpp')}</TableCell>
        </TableRow>
    );
};

export default function UsersPage() {
    const { data: session, status } = useSession();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchUsers() {
            setIsLoading(true);
            try {
                const data = await getAllUsers();
                // @ts-ignore
                setUsers(data);
            } catch (e: any) {
                setError(e.message || "Failed to fetch users");
            } finally {
                setIsLoading(false);
            }
        }
        if (status === 'authenticated') {
            fetchUsers();
        } else if (status === 'unauthenticated') {
            setIsLoading(false);
        }
    }, [status]);


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Users</h1>

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>
                        A list of all registered users on the platform.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="hidden md:table-cell">Date Joined</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                                    </TableRow>
                                ))
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-destructive">
                                        {error}
                                    </TableCell>
                                </TableRow>
                            ) : users && users.length > 0 ? (
                                users.map((user) => <UserRow key={user.id} user={user} />)
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
