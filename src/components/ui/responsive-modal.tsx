'use client';

import * as React from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface ResponsiveModalProps {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function ResponsiveModal({
  children,
  trigger,
  title,
  description,
  open,
  onOpenChange,
  className,
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className={cn('sm:max-w-[600px]', className)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent 
        side="bottom" 
        className={cn(
          'h-[92vh] sm:h-[90vh] px-4 pt-6 pb-0 rounded-t-[24px] flex flex-col', 
          className
        )}
      >
        <SheetHeader className="text-left shrink-0 pb-4 border-b border-border/50">
          <SheetTitle className="text-xl font-black tracking-tight">{title}</SheetTitle>
          {description && <SheetDescription className="text-xs font-medium uppercase tracking-wider opacity-60">{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-2 pb-8 no-scrollbar">
            {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
