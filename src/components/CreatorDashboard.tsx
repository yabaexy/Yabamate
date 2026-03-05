import React, { useState, useEffect } from 'react';
import { Wallet, Download, Users, TrendingUp, Clock } from 'lucide-react';
import { getEscrowContract, getWeb3Provider } from '../lib/web3';
import { formatAddress, formatWyda } from '../lib/utils';
import { motion } from 'motion/react';

interface CreatorDashboardProps {
  account: string;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ account }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalSupporters: 12,
    totalEarned: '1250.00',
    availableToWithdraw: '450.00',
  });

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      const provider = await getWeb3Provider();
      const signer = await provider.getSigner();
      const escrow = getEscrowContract(signer);
      
      // In a real app, we'd iterate over supporters or have a mapping for total available
      // For this demo, we'll just show the UI action
      alert('Withdrawal initiated. In a production app, this would call creatorWithdraw for each eligible supporter.');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900">Creator Dashboard</h1>
          <p className="text-zinc-500">Manage your supporters and earnings</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Connected Wallet</p>
            <p className="text-sm font-bold text-zinc-900">{formatAddress(account)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { label: 'Total Supporters', value: stats.totalSupporters, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Earned', value: `${stats.totalEarned} Yaba`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Available to Withdraw', value: `${stats.availableToWithdraw} Yaba`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-2xl", stat.bg)}>
              <stat.icon className={cn("h-6 w-6", stat.color)} />
            </div>
            <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-black text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Withdraw Earnings</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Funds are released from escrow every 30 days based on your active subscriptions.
            </p>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-bold text-white hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {loading ? 'Processing...' : 'Withdraw Available Funds'}
          </button>
        </div>

        <div className="mt-12">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Recent Supporters</h3>
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-6 py-4 font-bold">Supporter</th>
                  <th className="px-6 py-4 font-bold">Tier</th>
                  <th className="px-6 py-4 font-bold">Monthly Rate</th>
                  <th className="px-6 py-4 font-bold">Total Escrowed</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[1, 2, 3].map((_, i) => (
                  <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900">0x71C...3A9{i}</td>
                    <td className="px-6 py-4 text-zinc-600">Collector</td>
                    <td className="px-6 py-4 text-zinc-600">50.00 Yaba</td>
                    <td className="px-6 py-4 text-zinc-600">300.00 Yaba</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for dashboard
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
