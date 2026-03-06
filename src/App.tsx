import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CreatorCard } from './components/CreatorCard';
import { SubscriptionModal } from './components/SubscriptionModal';
import { CreatorDashboard } from './components/CreatorDashboard';
import { MOCK_CREATORS } from './mockData';
import { Creator, Tier } from './types';
import { connectWallet, getWydaContract, getEscrowContract, WYDA_TOKEN_ADDRESS, ESCROW_CONTRACT_ADDRESS } from './lib/web3';
import { parseUnits } from 'ethers';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Heart, Globe, ArrowRight, LayoutDashboard, Compass } from 'lucide-react';

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'explore' | 'dashboard'>('explore');

  const handleConnect = async () => {
    try {
      const address = await connectWallet();
      setAccount(address);
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect wallet. Please make sure MetaMask is installed.');
    }
  };

  const handleSubscribe = async (tier: Tier, months: number) => {
    if (!account || !selectedCreator) return;

    try {
      const { BrowserProvider } = await import('ethers');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const wyda = getWydaContract(signer);
      const escrow = getEscrowContract(signer);

      const monthlyRate = parseUnits(tier.price.toString(), 18);
      const totalAmount = monthlyRate * BigInt(months);

      // Check allowance
      const allowance = await wyda.allowance(account, ESCROW_CONTRACT_ADDRESS);
      if (allowance < totalAmount) {
        console.log('Approving WYDA...');
        const approveTx = await wyda.approve(ESCROW_CONTRACT_ADDRESS, totalAmount);
        await approveTx.wait();
        console.log('Approved!');
      }

      console.log('Subscribing...');
      const subTx = await escrow.subscribe(selectedCreator.address, monthlyRate, totalAmount);
      await subTx.wait();
      console.log('Subscribed successfully!');
      
      alert('Successfully subscribed! Your funds are now in escrow.');
    } catch (error: any) {
      console.error('Subscription failed:', error);
      alert(`Subscription failed: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar account={account} onConnect={handleConnect} />

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

                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {MOCK_CREATORS.map((creator) => (
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
      />
    </div>
  );
}
