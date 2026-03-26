'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '../logo';
import { ScrollArea } from '../ui/scroll-area';

interface UpgradePlanDialogProps {
  children: React.ReactNode;
  featureName: string;
}

export function UpgradePlanDialog({
  children,
  featureName,
}: UpgradePlanDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] text-center">
        <ScrollArea className="max-h-[60vh] pr-4">
          <DialogHeader className="items-center">
              <div className='p-3 bg-primary/10 rounded-full w-fit mb-4'>
                  <Zap className="h-8 w-8 text-primary" />
              </div>
            <DialogTitle className="text-2xl font-bold">
              Upgrade to Unlock {featureName}
            </DialogTitle>
            <DialogDescription className="px-4">
              This feature is only available on our Premium and Pro Plus plans. Upgrade your account to get a complete view of your finances and unlock powerful tools.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">With a paid plan, you get:</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside text-left">
                  <li>AI spending insights</li>
                  <li>Savings goals & Bill tracking</li>
                  <li>PDF & Excel reports</li>
                  <li>And much more!</li>
              </ul>
          </div>
        </ScrollArea>

        <DialogFooter className="justify-center border-t pt-4">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/pricing">View Upgrade Options</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
