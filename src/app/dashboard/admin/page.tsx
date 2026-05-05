'use client';

import { useUser, useUserProfile, useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, BarChart3, Briefcase, Loader2, Copy, Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { checkIsAdmin } from '@/lib/security-config';

const UpgradePlanDialog = dynamic(() => import('@/components/dashboard/upgrade-plan-dialog').then(mod => mod.UpgradePlanDialog));
const AdvancedForecasts = dynamic(() => import('@/components/dashboard/advanced-forecasts').then(mod => mod.AdvancedForecasts), { ssr: false });


function UserInfoCard() {
  const { user } = useUser();
  const { toast } = useToast();
  const [showFullId, setShowFullId] = useState(false);

  const handleCopy = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      toast({ title: 'Copied!', description: 'Your Access ID has been copied to the clipboard.' });
    }
  };

  const maskedId = user?.uid ? `${user.uid.slice(0, 6)}...${user.uid.slice(-4)}` : '';

  return (
    <Card className="glass-card border-primary/20 shadow-premium overflow-hidden group">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary/80 flex items-center gap-2">
           <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
           Security Credentials
        </CardTitle>
        <CardDescription className="text-xs font-bold uppercase tracking-tight opacity-50">
          Your unique account access identifier used for secure administrative authentication and support.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {user?.uid ? (
          <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 border border-border/40 rounded-2xl group/id">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Access ID</span>
              <span 
                className="text-xs font-mono font-bold tracking-wider cursor-pointer hover:text-primary transition-colors"
                onClick={() => setShowFullId(!showFullId)}
                title={showFullId ? "Click to mask" : "Click to reveal"}
              >
                {showFullId ? user.uid : maskedId}
              </span>
            </div>
            <div className="flex items-center gap-1">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowFullId(!showFullId)} 
                    className="h-8 w-8 rounded-lg opacity-40 group-hover/id:opacity-100 transition-opacity"
                >
                    <Users className="h-3.5 w-3.5" />
                </Button>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopy}
                    className="h-8 w-8 rounded-lg border-primary/20 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                >
                    <Copy className="h-3.5 w-3.5" />
                </Button>
            </div>
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

function SystemMaintenance() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);

  const handleRunExpiryCheck = async () => {
    if (!user) return;
    setIsRunning(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/cron/expire-subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Audit Complete',
          description: `Successfully processed ${result.expired} expired subscriptions.`,
        });
      } else {
        throw new Error(result.error || 'Check failed');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Audit Failed',
        description: error.message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-amber-500/20 bg-amber-500/[0.02]">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          System Maintenance
        </CardTitle>
        <CardDescription>
          Run automated compliance checks and subscription enforcement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-background/50 border border-border/40 rounded-2xl">
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase">Manual Expiry Enforcement</h4>
            <p className="text-[10px] text-muted-foreground mt-1">
              Scans all users and downgrades those whose 30-day window has closed.
            </p>
          </div>
          <Button 
            onClick={handleRunExpiryCheck} 
            disabled={isRunning}
            variant="outline"
            className="w-full sm:w-auto border-amber-500/20 hover:bg-amber-500/10"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Run Audit Now
          </Button>
        </div>
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
              Utilize advanced forecasting to project your financial health,
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
  const { profile, isProfileLoading, activeProfileId } = useUserProfile();

  const isDelegate = activeProfileId && user && activeProfileId !== user.uid;

  if (isDelegate) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20">
                <Lock className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-black font-headline tracking-tight text-primary">Privacy Shield Active</h1>
                <p className="text-muted-foreground font-medium max-w-md mx-auto">
                    You are currently in a delegated business session. Administrative controls, security credentials, and system management are restricted to the account owner.
                </p>
            </div>
            <Button asChild variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-primary/20 bg-primary/5 hover:bg-primary/10">
                <Link href="/dashboard/business">Return to Business Suite</Link>
            </Button>
        </div>
    );
  }

  const isAdmin = checkIsAdmin(profile, user);
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
            {isAdmin && (
              <div className="space-y-6">
                <UserManagement />
                <SystemMaintenance />
              </div>
            )}
            <ProPlusAdminFeatures isProPlus={isProPlus} />
        </>
      )}
    </div>
  );
}
