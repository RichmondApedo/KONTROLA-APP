'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { runBillReminderCheck } from '@/ai/flows/bill-reminder-flow';
import { Loader2, BellRing } from 'lucide-react';

export default function AdminPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleRunReminders = async () => {
    setIsLoading(true);
    try {
      const result = await runBillReminderCheck();
      if (result.success) {
        toast({
          title: 'Check Complete',
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Running Reminders',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Admin Panel
        </h1>
        <p className="text-muted-foreground">
          Run administrative tasks and flows.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bill Reminder Task</CardTitle>
          <CardDescription>
            Manually trigger the flow to check for all users' bills that are due
            tomorrow and send them a reminder. In a production environment, this
            would be automated by a cron job.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRunReminders} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BellRing className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Checking for Bills...' : 'Run Bill Reminder Check'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
