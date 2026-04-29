'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  BarChartBig, 
  Download, 
  PieChart, 
  TrendingUp, 
  Filter,
  Sparkles,
  History,
  FileSpreadsheet,
  Globe,
  Clock,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Calculator,
  Loader2,
} from 'lucide-react';
import { useUser, useUserProfile, useFirestore } from '@/firebase';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { usePeriod } from '@/components/period-provider';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { useFeatureDiscovery } from '@/hooks/use-feature-discovery';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  generateCashFlowReport,
  generateVATReport,
  generateExpenseDistributionReport,
  exportToExcel,
} from '@/lib/report-generator';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function ReportsPage() {
  const { user } = useUser();
  const { profile, isProfileLoading, activeProfileId } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isDelegate = activeProfileId && user && activeProfileId !== user.uid;
  const [loadingReport, setLoadingReport] = useState<string | null>(null);

  const { personal, business } = usePeriod();
  const activeTrack = isDelegate ? business : personal;
  const { 
    periodMode, 
    setPeriodMode, 
    label,
    customRange,
    setCustomRange,
    startDate,
    endDate,
  } = activeTrack;

  const { markAsDiscovered } = useFeatureDiscovery('reports_intro');
  const currency = profile?.preferredCurrency || 'ghs';
  const userId = (isDelegate ? activeProfileId : user?.uid) || '';

  async function handleDownload(reportId: string) {
    if (!firestore || !userId) {
      toast({ variant: 'destructive', title: 'Not ready', description: 'Please sign in to generate reports.' });
      return;
    }
    setLoadingReport(reportId);
    try {
      switch (reportId) {
        case 'cash-flow':
          await generateCashFlowReport(firestore, userId, startDate, endDate, currency);
          break;
        case 'tax-vat':
          await generateVATReport(firestore, userId, startDate, endDate, currency);
          break;
        case 'expense-dist':
          await generateExpenseDistributionReport(firestore, userId, startDate, endDate, currency);
          break;
        case 'vendor-spend': {
          const snap = await getDocs(query(collection(firestore, 'users', userId, 'expenses'), where('date', '>=', startDate), where('date', '<=', endDate)));
          const vendors: Record<string, { vendor: string; count: number; total: number }> = {};
          snap.docs.forEach(d => { const data = d.data(); const v = data.description || 'Unknown'; if (!vendors[v]) vendors[v] = { vendor: v, count: 0, total: 0 }; vendors[v].count++; vendors[v].total += data.amount || 0; });
          await exportToExcel({ title: 'Vendor Spend Analysis', subtitle: label, currency, columns: [{ header: 'Vendor', key: 'vendor', width: 30 }, { header: 'Transactions', key: 'count', width: 15 }, { header: 'Total Amount', key: 'total', width: 20 }], data: Object.values(vendors).sort((a, b) => b.total - a.total) });
          break;
        }
        default:
          toast({ title: 'Coming Soon', description: 'This report is being built for the next release.' });
      }
      if (['cash-flow','tax-vat','expense-dist','vendor-spend'].includes(reportId)) {
        toast({ title: 'Report Ready', description: 'Your report has been downloaded.' });
      }
    } catch (err: any) {
      console.error('[Reports] Generation failed:', err);
      toast({ variant: 'destructive', title: 'Generation Failed', description: err.message || 'Could not generate report. Please try again.' });
    } finally {
      setLoadingReport(null);
    }
  }

  const reportCategories = [
    {
      title: "Financial Statements",
      description: "Standard accounting reports for your business",
      icon: BarChartBig,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      reports: [
        { name: "Cash Flow Statement", type: "PDF/XLS", id: "cash-flow" },
        { name: "Profit & Loss (P&L)", type: "PDF/XLS", id: "pnl" },
        { name: "Balance Sheet", type: "PDF/XLS", id: "balance-sheet" },
      ]
    },
    {
      title: "Tax & Compliance",
      description: "Ready for GRA and statutory filings",
      icon: ShieldCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      reports: [
        { name: "VAT/NHIL/GETFund Report", type: "XLS", id: "tax-vat" },
        { name: "Income Tax Summary", type: "PDF", id: "tax-income" },
        { name: "Withholding Tax Log", type: "XLS", id: "tax-wht" },
      ]
    },
    {
      title: "Sales & Revenue",
      description: "Analyze your income and customers",
      icon: TrendingUp,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      reports: [
        { name: "Sales by Category", type: "Chart/PDF", id: "sales-category" },
        { name: "Top Customers Report", type: "PDF", id: "sales-customers" },
        { name: "Receivables Aging", type: "XLS", id: "receivables" },
      ]
    },
    {
      title: "Expense Intelligence",
      description: "Deep dive into your spending habits",
      icon: PieChart,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      reports: [
        { name: "Expense Distribution", type: "Chart/PDF", id: "expense-dist" },
        { name: "Vendor Spend Analysis", type: "XLS", id: "vendor-spend" },
        { name: "Operating Burn Rate", type: "PDF", id: "burn-rate" },
      ]
    }
  ];

  const recentReports = [
    { name: "Q1 Cash Flow Summary", date: "2 hours ago", status: "Ready", size: "1.2 MB" },
    { name: "March VAT Returns Data", date: "Yesterday", status: "Generated", size: "842 KB" },
    { name: "FY2025 Profit Projection", date: "2 days ago", status: "Archived", size: "2.4 MB" },
  ];

  if (isProfileLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 w-full bg-muted rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-muted rounded-3xl" />
          <div className="h-64 bg-muted rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-20">
      {/* Premium Background Elements */}
      <div className="absolute top-0 right-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      {/* --- EXPERT HEADER --- */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pt-6 pb-12 border-b border-border/10 relative">
        <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Intelligence Terminal</span>
          </div>
          <h1 className="text-[clamp(2rem,7vw,4rem)] font-black font-headline tracking-tighter text-foreground leading-[0.85]">
            Reports & <span className="text-primary">Audits</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60">
            Strategic Data Exports • <span className="text-primary">{label}</span>
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <PeriodSelector 
            periodMode={periodMode}
            onModeChange={setPeriodMode}
            incomeDate={profile?.incomeDate}
            label={label}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            onDiscovered={markAsDiscovered}
          />
          <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 border-border/40 bg-background/50 backdrop-blur-md">
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* --- QUICK ACTION STRIP --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-12">
        <Card className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer border-primary/20 bg-primary/[0.02]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-500 shadow-inner">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Quick Liquidity Scan</h3>
              <p className="text-xs text-muted-foreground font-medium">Instant PDF snapshot of today's health</p>
            </div>
            <ArrowUpRight className="ml-auto h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer border-emerald-500/20 bg-emerald-500/[0.02]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-500 shadow-inner">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Tax Preparation Kit</h3>
              <p className="text-xs text-muted-foreground font-medium">Consolidated data for GRA filing</p>
            </div>
            <ArrowUpRight className="ml-auto h-5 w-5 text-muted-foreground/30 group-hover:text-emerald-500 transition-colors" />
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer border-border/40 bg-background/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors duration-500 shadow-inner">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Custom XLS Export</h3>
              <p className="text-xs text-muted-foreground font-medium">Build your own data spreadsheet</p>
            </div>
            <ArrowUpRight className="ml-auto h-5 w-5 text-muted-foreground/30 transition-colors" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* --- MAIN REPORT GRID --- */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportCategories.map((category, idx) => (
              <Card key={idx} className="glass-card border-border/40 shadow-premium overflow-hidden group hover:border-primary/30 transition-all duration-500">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn("p-2.5 rounded-xl", category.bg)}>
                      <category.icon className={cn("h-5 w-5", category.color)} />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest opacity-40">Intelligence</Badge>
                  </div>
                  <CardTitle className="text-lg font-black tracking-tight">{category.title}</CardTitle>
                  <CardDescription className="text-xs font-medium">{category.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.reports.map((report, rIdx) => (
                    <div 
                      key={rIdx}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group/item cursor-pointer border border-transparent hover:border-border/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border border-border/20 shadow-sm">
                          <FileText className="h-4 w-4 text-muted-foreground/60 group-hover/item:text-primary transition-colors" />
                        </div>
                        <span className="text-[13px] font-bold text-foreground/80">{report.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{report.type}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg group-hover/item:bg-primary group-hover/item:text-white transition-all"
                          onClick={() => handleDownload(report.id)}
                          disabled={loadingReport === report.id}
                        >
                          {loadingReport === report.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Download className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* --- SMART INSIGHTS --- */}
          <Card className="glass-card border-emerald-500/20 bg-emerald-500/[0.01] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-1000">
              <Sparkles className="h-32 w-32 text-emerald-500" />
            </div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600">AI Report Auditor</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Powered by Kontrola IQ</p>
                </div>
              </div>
              <p className="text-lg font-black tracking-tight mb-4 leading-relaxed">
                "Your Cash Flow report for <span className="text-primary">{label}</span> shows a <span className="text-emerald-500">12% improvement</span> in collection speed compared to last period. We suggest generating a <span className="underline decoration-primary/30 underline-offset-4">Receivables Aging Report</span> to identify remaining bottlenecks."
              </p>
              <Button className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">
                Run Diagnostic Audit
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* --- RECENT ARCHIVE --- */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary opacity-60" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Recent Activity</h3>
            </div>
            <Button variant="link" className="h-auto p-0 text-[10px] font-black uppercase tracking-widest text-primary">Clear History</Button>
          </div>
          
          <div className="space-y-4">
            {recentReports.map((report, idx) => (
              <Card key={idx} className="glass-card border-border/20 bg-background/40 hover:border-primary/20 transition-all duration-300">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-black truncate">{report.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-muted-foreground/60">{report.date}</span>
                      <span className="text-[10px] font-black text-primary/40">•</span>
                      <span className="text-[10px] font-black text-primary/60">{report.size}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                    <Download className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="glass-card border-primary/20 bg-primary/[0.02] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary/80">Pro Feature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 w-full bg-gradient-to-br from-primary/10 to-emerald-500/10 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                <Globe className="h-8 w-8 text-primary mb-2 animate-bounce" />
                <h4 className="text-xs font-black uppercase tracking-widest mb-1">Live Cloud Sync</h4>
                <p className="text-[10px] text-muted-foreground font-medium">Sync reports directly to your Accountant's portal or Google Drive.</p>
              </div>
              <Button variant="outline" className="w-full mt-4 rounded-xl border-primary/20 text-[10px] font-black uppercase tracking-widest h-10">
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
