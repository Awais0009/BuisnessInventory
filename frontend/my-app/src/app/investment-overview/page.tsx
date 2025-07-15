'use client';

import { Navbar } from '@/components/dashboard/Navbar';
import CropAnalyticsDashboard from '@/components/investment-overview/CropAnalyticsDashboard';

export default function InvestmentOverviewPage() {
  return (
    <>
      <Navbar />
      <CropAnalyticsDashboard />
    </>
  );
} 