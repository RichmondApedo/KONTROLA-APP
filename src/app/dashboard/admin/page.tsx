'use client';

import { useUser, useUserProfile, useFirebase } from '@/firebase';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, BarChart3, Briefcase, Loader2, Copy } from 'lucide-react';
import Link from 'next/link';
import { AdvancedForecasts } from '@/components/dashboard/advanced-forecasts';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

function UserInfoCard() {
  const { user } = useUser();
  const { toast } = useToast();

  const handleCopy = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      toast({ title: 'Copied!', description: 'Your User ID has been copied to the clipboard.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your User Information</CardTitle>
        <CardDescription>Your unique User ID for administrative tasks like setting your role.</CardDescription>
      </CardHeader>
      <CardContent>
        {user?.uid ? (
          <div className="flex items-center justify-between gap-4 p-3 bg-secondary rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Your User ID</span>
              <span className="text-xs text-muted-foreground font-mono break-all">{user.uid}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">User ID not available. Please ensure you are logged in.</p>
        )}
      </CardContent>
    </Card>
  )
}

function UserManagement() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [targetUserId, setTargetUserId] = useState('');
  const [newPlan, setNewPlan] = useState<'free' | 'premium' | 'pro-plus'>('free');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !targetUserId) {
      toast({ variant: 'destructive', title: 'Error', description: 'User ID is required.' });
      return;
    }

    setIsSubmitting(true);
    const profileRef = doc(firestore, `users/${targetUserId}/profile/${targetUserId}`);

    try {
      await updateDoc(profileRef, {
        plan: newPlan,
        role: newRole,
        subscriptionStatus: newPlan !== 'free' ? 'active' : 'inactive',
      });
      toast({ title: 'Success', description: `User ${targetUserId} has been updated.` });
      setTargetUserId('');
    } catch (error: any) {
      console.error('User update failed:', error);
      toast({ variant: 'destructive', title: 'Update Failed', description: `Could not update user. Ensure the User ID is correct. Error: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manually update a user's subscription plan and role.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetUserId">User ID</Label>
            <Input
              id="targetUserId"
              placeholder="Enter the user's Firebase UID"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPlan">New Plan</Label>
            <Select value={newPlan} onValueChange={(value) => setNewPlan(value as any)} disabled={isSubmitting}>
              <SelectTrigger id="newPlan">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="pro-plus">Pro Plus</SelectItem>
              </SelectContent>
            </Select>
          </div>
           <div className="space-y-2">
            <Label htmlFor="newRole">Role</Label>
            <Select value={newRole} onValueChange={(value) => setNewRole(value as any)} disabled={isSubmitting}>
              <SelectTrigger id="newRole">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isSubmitting || !targetUserId}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update User
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ProPlusAdminFeatures({ isProPlus }: { isProPlus: boolean }) {
  const businessManageButton = isProPlus ? (
    <Button variant="outline" asChild>
      <Link href="/dashboard/business">Manage</Link>
    </Button>
  ) : (
    <UpgradePlanDialog featureName="Business Account Management">
      <Button variant="outline" className="w-full sm:w-auto">
        Manage
      </Button>
    </UpgradePlanDialog>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users />
            Account Management
          </CardTitle>
          <CardDescription>
            Manage personal and business accounts, add multiple accounts, view consolidated reports, and manage permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-secondary rounded-lg gap-2">
            <p className="font-medium">Personal Account</p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/settings">Manage</Link>
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-secondary rounded-lg gap-2">
            <div className="flex items-center gap-2">
              <Briefcase className="text-muted-foreground" />
              <p className="font-medium">Business Account</p>
            </div>
            {businessManageButton}
          </div>
        </CardContent>
      </Card>
      {isProPlus ? (
        <AdvancedForecasts />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 />
              Advanced Forecasts
            </CardTitle>
            <CardDescription>
              Utilize AI-powered forecasting to project your financial health,
              model different scenarios, and get proactive advice on your
              financial strategy.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-center text-muted-foreground">
              Forecasting models and charts will be displayed here.
            </p>
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center flex-col gap-2 p-4">
              <p className="text-center font-semibold text-foreground">
                This is a Pro Plus feature.
              </p>
              <UpgradePlanDialog featureName="Advanced Forecasts">
                <Button>Upgrade to Unlock</Button>
              </UpgradePlanDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useUser();
  const { profile, isProfileLoading } = useUserProfile();

  const isAdmin = profile?.role === 'admin' || user?.uid === 'Pf2A2D4kfWdnLbrWjQTCz0OwLai1';
  const isProPlus = profile?.plan === 'pro-plus' || isAdmin;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Admin Panel
        </h1>
        <p className="text-muted-foreground">
          Oversee accounts, access Pro features, and manage business settings.
        </p>
      </div>

      {isProfileLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
            <UserInfoCard />
            {isAdmin && <UserManagement />}
            <ProPlusAdminFeatures isProPlus={isProPlus} />
        </>
      )}
    </div>
  );
}
