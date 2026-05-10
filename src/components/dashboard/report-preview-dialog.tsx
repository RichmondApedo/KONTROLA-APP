'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Loader2, Table, AlertCircle } from 'lucide-react';
import { getReportData, ReportData, ReportType } from '@/lib/report-generator';
import { useFirestore } from '@/firebase';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';

interface ReportPreviewDialogProps {
  reportId: string;
  reportName: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  currency: string;
  children?: React.ReactNode;
}

export function ReportPreviewDialog({ 
    reportId, 
    reportName, 
    userId, 
    startDate, 
    endDate, 
    currency,
    children
}: ReportPreviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const firestore = useFirestore();

  async function loadPreview() {
    if (!firestore || !userId) return;
    setIsLoading(true);
    try {
        const result = await getReportData(reportId as ReportType, firestore, userId, startDate, endDate, currency);
        setData(result);
    } catch (err) {
        console.error("Failed to load report preview:", err);
    } finally {
        setIsLoading(false);
    }
  }

  const renderValue = (val: any, colHeader: string) => {
    if (val === null || val === undefined) return '-';
    if (colHeader.toLowerCase().includes('amount') || colHeader.toLowerCase().includes('total') || colHeader.toLowerCase().includes('tax')) {
        return <span className="font-bold text-foreground">{formatCurrency(Number(val), currency)}</span>;
    }
    if (val instanceof Timestamp) return format(val.toDate(), 'dd MMM yyyy');
    if (val instanceof Date) return format(val, 'dd MMM yyyy');
    if (typeof val === 'object' && val.seconds) return format(new Date(val.seconds * 1000), 'dd MMM yyyy');
    return String(val);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (open && !data) loadPreview();
    }}>
      <DialogTrigger asChild>
        {children || (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                <Eye className="h-4 w-4" />
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col glass-card border-border/40 shadow-2xl p-0">
        <DialogHeader className="p-6 border-b border-border/10 bg-muted/20">
          <div className="flex items-center gap-3 mb-1">
             <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Table className="h-4 w-4 text-primary" />
             </div>
             <DialogTitle className="text-xl font-black tracking-tight">{reportName}</DialogTitle>
          </div>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">
            Read-Only Data Preview • {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-0 min-h-[300px]">
            {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                    <Loader2 className="h-10 w-10 text-primary animate-spin opacity-40" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 animate-pulse">Analyzing Transaction Data...</p>
                </div>
            ) : data && data.data.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-md z-10">
                            <tr>
                                {data.columns.map((col, i) => (
                                    <th key={i} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/10">
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/5">
                            {data.data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-primary/[0.02] transition-colors">
                                    {data.columns.map((col, colIndex) => (
                                        <td key={colIndex} className="px-6 py-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
                                            {renderValue(row[col.key], col.header)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">No records found for this period</p>
                </div>
            )}
        </div>

        <div className="p-6 border-t border-border/10 bg-muted/20 flex items-center justify-between">
            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                {data ? `${data.data.length} Records Retrieved` : 'Intelligence Terminal'}
            </p>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="rounded-xl font-black uppercase tracking-widest text-[10px] h-9 px-6 border-border/40 hover:bg-background/80"
            >
                Close Preview
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
