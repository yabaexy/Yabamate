import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CreatorCard } from './components/CreatorCard';
import { SubscriptionModal } from './components/SubscriptionModal';
import { CreatorDashboard } from './components/CreatorDashboard';
import { Arcade } from './components/Arcade';
import { MOCK_CREATORS } from './mockData';
import { Creator, Tier } from './types';
import { connectWallet, getWydaContract, WYDA_TOKEN_ADDRESS, ESCROW_CONTRACT_ADDRESS } from './lib/web3';
import { useYMP, YMP_TO_WYDA_RATE } from './hooks/useYMP';
import { parseUnits } from 'ethers';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Heart, Globe, ArrowRight, LayoutDashboard, Compass, Gamepad2, Gift } from 'lucide-react';

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'explore' | 'dashboard' | 'arcade'>('explore');
  const [showRewardToast, setShowRewardToast] = useState<{ points: number; message: string } | null>(null);

  const { points, checkAttendance, markGamePlayed, spendPoints } = useYMP(account);

  useEffect(() => {
    if (account) {
      checkAttendance().then(pointsEarned => {
        if (pointsEarned > 0) {
          setShowRewardToast({ 
            points: pointsEarned, 
            message: `Daily Attendance Reward! +${pointsEarned} YMP` 
          });
          setTimeout(() => setShowRewardToast(null), 5000);
        }
      });
    }
  }, [account]);

  const handleGamePlayed = async (game: 'tetris' | 'pong' | 'backgammon') => {
    if (!account) return;
    const bonus = await markGamePlayed(game);
    if (bonus && bonus > 0) {
      setShowRewardToast({
        points: bonus,
        message: `Daily Mission Complete! +${bonus} YMP`
      });
      setTimeout(() => setShowRewardToast(null), 5000);
    }
  };

  useEffect(() => {
    // Check for daily task completion bonus
    // This is a bit tricky with the current hook structure, but we can monitor points
  }, [points]);

  // Filtering state
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterCondition, setFilterCondition] = useState<string>('All');
  const [filterMinPrice, setFilterMinPrice] = useState<number>(0);
  const [filterMaxPrice, setFilterMaxPrice] = useState<number>(1000);

  const filteredCreators = MOCK_CREATORS.filter(creator => {
    const minTierPrice = Math.min(...creator.tiers.map(t => t.price));
    
    const matchesCategory = filterCategory === 'All' || creator.category === filterCategory;
    const matchesCondition = filterCondition === 'All' || creator.condition === filterCondition;
    const matchesPrice = minTierPrice >= filterMinPrice && minTierPrice <= filterMaxPrice;
    
    return matchesCategory && matchesCondition && matchesPrice;
  });

  const categories = ['All', ...new Set(MOCK_CREATORS.map(c => c.category))];
  const conditions = ['All', 'New', 'Trending', 'Verified'];

  const handleConnect = async () => {
    try {
      const address = await connectWallet();
      setAccount(address);
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect wallet. Please make sure MetaMask is installed.');
    }
  };

  const handleSubscribe = async (tier: Tier, months: number, useYMPAmount: number) => {
    if (!account || !selectedCreator) return;

    try {
      const { BrowserProvider } = await import('ethers');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const wyda = getWydaContract(signer);

      const totalWydaRequired = tier.price * months;
      const wydaDiscount = useYMPAmount / YMP_TO_WYDA_RATE;
      const finalWydaToPay = Math.max(0, totalWydaRequired - wydaDiscount);

      if (useYMPAmount > 0) {
        const spent = spendPoints(useYMPAmount);
        if (!spent) {
          alert('Insufficient YMP points.');
          return;
        }
      }

      if (finalWydaToPay > 0) {
        const amountToPay = parseUnits(finalWydaToPay.toString(), 18);
        console.log(`Transferring ${finalWydaToPay} WYDA to escrow...`);
        const tx = await wyda.transfer(ESCROW_CONTRACT_ADDRESS, amountToPay);
        await tx.wait();
        console.log('Transfer successful!');
      }

      // Automatically construct and "send" the notification email
      const recipient = 'loopyfy@proton.me';
      const subject = encodeURIComponent(`[Escrow Notification] New Subscription for ${selectedCreator.name}`);
      const body = encodeURIComponent(
        `A new subscription has been pre-funded for the following creator:\n\n` +
        `Seller Name: ${selectedCreator.name}\n` +
        `Seller WYDA Destination Address: ${selectedCreator.address}\n` +
        `Subscription Tier: ${tier.name}\n` +
        `Subscription Unit Period: ${tier.period}\n` +
        `Pre-funded Duration: ${months} months\n` +
        `Total Amount Transferred to Escrow: ${finalWydaToPay} WYDA\n` +
        (useYMPAmount > 0 ? `YMP Points Used: ${useYMPAmount} (Equivalent to ${wydaDiscount} WYDA)\n` : '') +
        `Total Value: ${totalWydaRequired} WYDA\n\n` +
        `Please verify the escrow transfer and update the subscription status accordingly.`
      );

      // Open the mail client with the pre-filled message
      window.open(`mailto:${recipient}?subject=${subject}&body=${body}`);
      
      alert('Successfully subscribed! Your funds have been transferred to the escrow address and a notification has been sent.');
    } catch (error: any) {
      console.error('Subscription failed:', error);
      alert(`Subscription failed: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar account={account} onConnect={handleConnect} ympPoints={points} />

      {/* View Switcher (Only if connected) */}
      {account && (
        <div className="sticky top-16 z-40 flex justify-center border-b border-zinc-100 bg-white/80 py-2 backdrop-blur-md">
          <div className="flex gap-1 rounded-full bg-zinc-100 p-1">
            <button
              onClick={() => setView('explore')}
              className={`flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold transition-all ${
                view === 'explore' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Compass className="h-4 w-4" />
              Explore
            </button>
            <button
              onClick={() => setView('arcade')}
              className={`flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold transition-all ${
                view === 'arcade' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
              Arcade
            </button>
            <button
              onClick={() => setView('dashboard')}
              className={`flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold transition-all ${
                view === 'dashboard' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Reward Toast */}
      <AnimatePresence>
        {showRewardToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[100] flex items-center gap-3 rounded-2xl bg-zinc-900 px-6 py-4 text-white shadow-2xl"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold">{showRewardToast.message}</p>
              <p className="text-[10px] text-zinc-400">Keep it up to earn more!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        <AnimatePresence mode="wait">
          {view === 'explore' ? (
            <motion.div
              key="explore"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Hero Section */}
              <section className="relative overflow-hidden bg-white py-24 sm:py-32">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.emerald.50),white)]" />
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                  <div className="mx-auto max-w-2xl text-center">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        Powered by BSC & Yabamate
                      </span>
                      <h1 className="mt-8 text-5xl font-black tracking-tight text-zinc-900 sm:text-7xl">
                        Support Creators with <span className="text-emerald-600">Escrow Confidence</span>
                      </h1>
                      <p className="mt-6 text-lg leading-8 text-zinc-600">
                        The first decentralized Patreon-style platform where your support is protected. 
                        Funds are released monthly, and you can cancel anytime. No middlemen, just pure support.
                      </p>
                      <div className="mt-10 flex items-center justify-center gap-x-6">
                        <button
                          onClick={handleConnect}
                          className="rounded-full bg-zinc-900 px-8 py-4 text-sm font-bold text-white shadow-sm hover:bg-zinc-800 transition-all active:scale-95"
                        >
                          Get Started
                        </button>
                        <a href="#explore" className="text-sm font-bold leading-6 text-zinc-900 flex items-center gap-1 group">
                          Explore Creators <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </a>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Features */}
              <section className="py-24 bg-zinc-50">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                  <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
                    {[
                      {
                        icon: Shield,
                        title: "Escrow Protection",
                        desc: "Your WYDA tokens are held in a smart contract and released to creators monthly."
                      },
                      {
                        icon: Zap,
                        title: "Instant Access",
                        desc: "Unlock exclusive content and benefits immediately after subscribing."
                      },
                      {
                        icon: Heart,
                        title: "Direct Support",
                        desc: "98% of your contribution goes directly to the creator. No platform fees."
                      }
                    ].map((feature, i) => (
                      <div key={i} className="flex flex-col items-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
                          <feature.icon className="h-6 w-6 text-emerald-600" />
                        </div>
                        <h3 className="mt-6 text-lg font-bold text-zinc-900">{feature.title}</h3>
                        <p className="mt-2 text-sm text-zinc-500">{feature.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Creators Grid */}
              <section id="explore" className="py-24 bg-white">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                  <div className="flex items-end justify-between mb-12">
                    <div>
                      <h2 className="text-3xl font-black tracking-tight text-zinc-900">Featured Creators</h2>
                      <p className="mt-2 text-zinc-500">Discover and support your favorite artists, educators, and makers.</p>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="mb-12 grid grid-cols-1 gap-6 rounded-3xl border border-zinc-100 bg-zinc-50/50 p-8 sm:grid-cols-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Category</label>
                      <select 
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="mt-2 block w-full rounded-xl border-zinc-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500"
                      >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Condition</label>
                      <select 
                        value={filterCondition}
                        onChange={(e) => setFilterCondition(e.target.value)}
                        className="mt-2 block w-full rounded-xl border-zinc-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500"
                      >
                        {conditions.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Price Range (WYDA)</label>
                      <div className="mt-2 flex items-center gap-4">
                        <input 
                          type="number" 
                          value={filterMinPrice}
                          onChange={(e) => setFilterMinPrice(Number(e.target.value))}
                          placeholder="Min"
                          className="block w-full rounded-xl border-zinc-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-zinc-400">to</span>
                        <input 
                          type="number" 
                          value={filterMaxPrice}
                          onChange={(e) => setFilterMaxPrice(Number(e.target.value))}
                          placeholder="Max"
                          className="block w-full rounded-xl border-zinc-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCreators.map((creator) => (
                      <CreatorCard
                        key={creator.id}
                        creator={creator}
                        onClick={() => {
                          setSelectedCreator(creator);
                          setIsModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </section>
            </motion.div>
          ) : view === 'arcade' ? (
            <motion.div
              key="arcade"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Arcade account={account} onGamePlayed={handleGamePlayed} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {account && <CreatorDashboard account={account} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-zinc-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <img 
                src={`data:image/svg+xml,${encodeURIComponent(`
                  <svg width="300" height="120" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#18181b" rx="8"/>
                    <text x="50%" y="45" font-family="cursive, sans-serif" font-size="32" fill="#d8b4fe" text-anchor="middle" style="filter: drop-shadow(0 0 5px #a855f7); font-weight: bold;">YABA</text>
                    <text x="50%" y="90" font-family="cursive, sans-serif" font-size="32" fill="#d8b4fe" text-anchor="middle" style="filter: drop-shadow(0 0 5px #a855f7); font-weight: bold;">MATE</text>
                  </svg>
                `)}`}
                alt="Yabamate" 
                className="h-12 w-auto rounded-lg" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <p className="text-xs text-zinc-400">
              © 2024. Built on Binance Smart Chain.
            </p>
            <div className="flex gap-6 text-xs font-medium text-zinc-500">
              <a href="#" className="hover:text-zinc-900">Terms</a>
              <a href="#" className="hover:text-zinc-900">Privacy</a>
              <a href="#" className="hover:text-zinc-900">Docs</a>
            </div>
          </div>
        </div>
      </footer>

      <SubscriptionModal
        creator={selectedCreator}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubscribe={handleSubscribe}
        ympPoints={points}
      />
    </div>
  );
}
