'use client';

import { Navbar } from '@/components/dashboard/Navbar';
import { TransactionLedger } from '@/components/transaction-ledger/TransactionLedger';

export default function TransactionLedgerPage() {
  return (
    <>
      <Navbar />
      <TransactionLedger />
    </>
  );
} 