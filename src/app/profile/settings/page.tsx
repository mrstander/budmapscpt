'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from 'next-auth/react';
import { getUserProfile, updateProfileEmail, updateProfileAddress, updatePassword } from '@/lib/actions/user-actions';

const profileSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

const addressSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { email: '' },
  });

  const addressForm = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: { address: '', city: '', state: '', zipCode: '' },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const { formState: { isSubmitting: isProfileSubmitting, isDirty: isProfileDirty }, reset: resetProfile } = profileForm;
  const { formState: { isSubmitting: isAddressSubmitting, isDirty: isAddressDirty }, reset: resetAddress } = addressForm;
  const { formState: { isSubmitting: isPasswordSubmitting }, reset: resetPassword } = passwordForm;

  useEffect(() => {
    async function loadUserData() {
      setIsLoading(true);
      const user = await getUserProfile();
      if (user) {
        resetProfile({ email: user.email || '' });
        resetAddress({
          address: user.address || '',
          city: user.city || '',
          state: user.state || '',
          zipCode: user.zipCode || '',
        });
      }
      setIsLoading(false);
    }

    if (status === 'authenticated') {
      loadUserData();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, resetProfile, resetAddress]);


  const onUpdateProfile = async (values: z.infer<typeof profileSchema>) => {
    const result = await updateProfileEmail(values);
    if (result.success) {
      toast({ title: 'Email Updated', description: `Your email has been changed to ${values.email}.` });
      resetProfile(values);
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    }
  };

  const onUpdateAddress = async (values: z.infer<typeof addressSchema>) => {
    const result = await updateProfileAddress(values);
    if (result.success) {
      toast({ title: 'Address Updated', description: 'Your delivery address has been saved.' });
      resetAddress(values);
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    }
  };

  const onUpdatePassword = async (values: z.infer<typeof passwordSchema>) => {
    const result = await updatePassword(values);
    if (result.success) {
      toast({ title: 'Password Updated', description: 'Your password has been changed.' });
      resetPassword();
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-10 w-full" /></CardContent>
          <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <div>Please log in to view settings.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline">Settings</h1>

      <Form {...profileForm}>
        <form onSubmit={profileForm.handleSubmit(onUpdateProfile)}>
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Manage your account email address.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField control={profileForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isProfileSubmitting || !isProfileDirty}>
                {isProfileSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <Form {...addressForm}>
        <form onSubmit={addressForm.handleSubmit(onUpdateAddress)}>
          <Card>
            <CardHeader>
              <CardTitle>Delivery Address</CardTitle>
              <CardDescription>Manage your default delivery address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={addressForm.control} name="address" render={({ field }) => <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={addressForm.control} name="city" render={({ field }) => <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Los Angeles" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={addressForm.control} name="state" render={({ field }) => <FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="CA" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={addressForm.control} name="zipCode" render={({ field }) => <FormItem><FormLabel>Zip Code</FormLabel><FormControl><Input placeholder="90210" {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isAddressSubmitting || !isAddressDirty}>
                {isAddressSubmitting ? 'Saving...' : 'Save Address'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <Form {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(onUpdatePassword)}>
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Change your password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Current password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" placeholder="New password (min. 6 chars)" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPasswordSubmitting} variant="outline">Update Password</Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
