'use client';

import { Navbar } from '@/components/dashboard/Navbar';
import { InvestmentOverview } from '@/components/investment-overview/InvestmentOverview';

export default function InvestmentOverviewPage() {
  return (
    <>
      <Navbar />
      <InvestmentOverview />
    </>
  );
} 