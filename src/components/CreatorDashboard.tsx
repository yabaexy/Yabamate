import React, { useState, useEffect } from 'react';
import { Wallet, Download, Users, TrendingUp, Clock, LineChart as ChartIcon, ExternalLink, ArrowRightLeft, Sparkles } from 'lucide-react';
import { getEscrowContract, getWeb3Provider, WYDA_TOKEN_ADDRESS } from '../lib/web3';
import { formatAddress, formatWyda } from '../lib/utils';
import { motion } from 'motion/react';
import { useWydaPrice } from '../hooks/useWydaPrice';
import { PriceChart } from './PriceChart';

const USDC_TOKEN_ADDRESS = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
const APESWAP_URL = `https://apeswap.finance/swap?inputCurrency=${WYDA_TOKEN_ADDRESS}&outputCurrency=${USDC_TOKEN_ADDRESS}`;
const APESWAP_LP_URL = `https://apeswap.finance/add-liquidity/0x55d398326f99059fF775485246999027B3197955/0xD84B7E8b295d9Fa9656527AC33Bf4F683aE7d2C4`;

interface CreatorDashboardProps {
  account: string;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ account }) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    bio: '',
    avatar_url: '',
  });
  const [stats, setStats] = useState({
    totalSupporters: 0,
    totalEarned: '0.00',
    availableToWithdraw: '0.00',
  });

  const [tiers, setTiers] = useState<any[]>([]);
  const [museLevel, setMuseLevel] = useState<number | null>(null);
  const [newTier, setNewTier] = useState({
    name: '',
    priceWyda: '',
    period: 'Monthly',
    description: '',
    autoRenewEnabled: false,
  });

  useEffect(() => {
    if (account) {
      fetch(`/api/user/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account }),
      })
        .then(res => res.json())
        .then(data => {
          setProfile({
            name: data.name || '',
            bio: data.bio || '',
            avatar_url: data.avatar_url || '',
          });
        });

      fetch(`/api/tiers/${account}`)
        .then(res => res.json())
        .then(data => setTiers(data));

      fetch(`/api/muse/${account}`)
        .then(res => res.json())
        .then(data => setMuseLevel(data.level))
        .catch(() => setMuseLevel(null));
    }
  }, [account]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('address', account);
    formData.append('name', profile.name);
    formData.append('bio', profile.bio);
    
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput?.files?.[0]) {
      formData.append('avatar', fileInput.files[0]);
    }

    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        alert('Profile updated!');
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTier = async () => {
    if (!newTier.name || !newTier.priceWyda) {
      alert('Please fill in at least the name and price.');
      return;
    }

    const tier = {
      id: Math.random().toString(36).substr(2, 9),
      creator_address: account,
      name: newTier.name,
      price: parseFloat(newTier.priceWyda),
      period: newTier.period,
      description: newTier.description || 'No description provided.',
      auto_renew_enabled: newTier.autoRenewEnabled,
    };

    try {
      const res = await fetch('/api/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tier),
      });
      if (res.ok) {
        setTiers([...tiers, tier]);
        setNewTier({
          name: '',
          priceWyda: '',
          period: 'Monthly',
          description: '',
          autoRenewEnabled: false,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWydaChange = (val: string) => {
    setNewTier({
      ...newTier,
      priceWyda: val,
    });
  };

  const lpRewards = [
    { range: '$50 ~ $200', ymp: '8,000 YMP', benefits: 'Bronze Muse 스킨' },
    { range: '$200 ~ $500', ymp: '22,000 YMP', benefits: 'Silver Muse 스킨 + 7일 상단 노출권' },
    { range: '$500 ~ $1,000', ymp: '55,000 YMP', benefits: 'Gold Muse 스킨 + 15일 부스팅' },
    { range: '$1,000 ~ $3,000', ymp: '150,000 YMP', benefits: 'Platinum Muse 세트 + 전용 배지' },
    { range: '$3,000 이상', ymp: '400,000 YMP', benefits: 'Legendary Muse 스킨 + Muse 페이지 전용 프레임' },
  ];

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
        {museLevel !== null && (
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">My Muse</p>
              <p className="text-sm font-bold text-zinc-900">Lv.{museLevel}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {[
          { label: 'Total Supporters', value: stats.totalSupporters, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Earned', value: `${stats.totalEarned} WYDA`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900">Edit Profile</h2>
          <form onSubmit={handleUpdateProfile} className="mt-6 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-zinc-100 bg-zinc-50">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-300">
                    <Users className="h-10 w-10" />
                  </div>
                )}
              </div>
              <input type="file" id="avatar-upload" accept="image/*" className="text-xs text-zinc-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500">Display Name</label>
              <input 
                type="text" 
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                className="mt-1 block w-full rounded-xl border-zinc-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500">Bio</label>
              <textarea 
                value={profile.bio}
                onChange={(e) => setProfile({...profile, bio: e.target.value})}
                rows={3}
                className="mt-1 block w-full rounded-xl border-zinc-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">WYDA Performance</h2>
              <p className="text-sm text-zinc-500">Historical price performance against USDC (24h)</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-emerald-700">
              <ChartIcon className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Live Market</span>
            </div>
          </div>
          <PriceChart />
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-zinc-900">Manage Subscription Tiers</h2>
        <p className="mt-1 text-sm text-zinc-500">Create and update your subscription plans for supporters.</p>
        
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Create Form */}
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Create New Tier</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500">Tier Name</label>
                <input 
                  type="text" 
                  value={newTier.name}
                  onChange={(e) => setNewTier({...newTier, name: e.target.value})}
                  placeholder="e.g. Gold Member"
                  className="mt-1 block w-full rounded-xl border-zinc-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500">Price (WYDA)</label>
                  <div className="relative mt-1">
                    <input 
                      type="number" 
                      value={newTier.priceWyda}
                      onChange={(e) => handleWydaChange(e.target.value)}
                      placeholder="0.00"
                      className="block w-full rounded-xl border-zinc-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500">Billing Period</label>
                  <select 
                    value={newTier.period}
                    onChange={(e) => setNewTier({...newTier, period: e.target.value})}
                    className="mt-1 block w-full rounded-xl border-zinc-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500">Description</label>
                <textarea 
                  value={newTier.description}
                  onChange={(e) => setNewTier({...newTier, description: e.target.value})}
                  placeholder="What benefits do supporters get?"
                  rows={3}
                  className="mt-1 block w-full rounded-xl border-zinc-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white p-4">
                <input 
                  type="checkbox"
                  id="auto-renew"
                  checked={newTier.autoRenewEnabled}
                  onChange={(e) => setNewTier({...newTier, autoRenewEnabled: e.target.checked})}
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="auto-renew" className="text-xs font-bold text-zinc-700 cursor-pointer">
                  Enable Auto-renewal
                  <span className="block text-[10px] font-normal text-zinc-400">Automatically renew subscription using WYDA balance</span>
                </label>
              </div>

              <button 
                onClick={handleCreateTier}
                className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-all active:scale-95"
              >
                Create Tier
              </button>
            </div>
          </div>

          {/* Existing Tiers Preview */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Your Active Tiers</h3>
            <div className="mt-4 space-y-4">
              {tiers.length > 0 ? (
                tiers.map((tier, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-zinc-100 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-zinc-900">{tier.name}</h4>
                        {tier.auto_renew_enabled === 1 && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Auto-renew
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{tier.period}</p>
                      <p className="mt-1 text-xs text-zinc-500">{tier.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-zinc-900">{tier.price} WYDA</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
                  <p className="text-sm text-zinc-500">No tiers created yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Liquidity & Swap</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Provide liquidity to earn massive YMP rewards and exclusive Muse skins.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={APESWAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-6 py-4 text-sm font-bold text-zinc-900 hover:bg-zinc-200 transition-all active:scale-95"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Swap on ApeSwap
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
            <a
              href={APESWAP_LP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-bold text-white hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              WYDA LP on ApeSwap
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
          </div>
        </div>

        {/* LP Reward Table */}
        <div className="mt-12">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">LP Provider Rewards (30 Days)</h3>
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-white">
                <tr>
                  <th className="px-6 py-4 font-bold">LP 제공 규모 (30일 기준)</th>
                  <th className="px-6 py-4 font-bold">YMP 지급량 (30일)</th>
                  <th className="px-6 py-4 font-bold">추가 혜택</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lpRewards.map((reward, i) => (
                  <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900">{reward.range}</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">{reward.ymp}</td>
                    <td className="px-6 py-4 text-zinc-600">{reward.benefits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                {stats.totalSupporters > 0 ? (
                  [1, 2, 3].map((_, i) => (
                    <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-900">0x71C...3A9{i}</td>
                      <td className="px-6 py-4 text-zinc-600">Collector</td>
                      <td className="px-6 py-4 text-zinc-600">50.00 WYDA</td>
                      <td className="px-6 py-4 text-zinc-600">300.00 WYDA</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      No supporters yet. Share your profile to start earning!
                    </td>
                  </tr>
                )}
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
