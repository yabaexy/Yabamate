import React from 'react';
import { Wallet, Search, Bell, User } from 'lucide-react';
import { cn, formatAddress } from '../lib/utils';

interface NavbarProps {
  account: string | null;
  onConnect: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ account, onConnect }) => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <img 
              src="https://picsum.photos/seed/yabamate/300/100" 
              alt="Yabamate" 
              className="h-10 w-auto" 
              referrerPolicy="no-referrer" 
            />
            <span className="text-xl font-bold tracking-tight text-zinc-900">Yabamate</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
            <a href="#" className="hover:text-emerald-600 transition-colors">Explore</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Creators</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">My Subscriptions</a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search creators..."
              className="h-9 w-64 rounded-full border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
            <Bell className="h-5 w-5" />
          </button>

          {account ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 uppercase">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                BSC Network
              </div>
              <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white p-1 pr-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100">
                  <User className="h-4 w-4 text-zinc-600" />
                </div>
                <span className="text-xs font-medium text-zinc-700">{formatAddress(account)}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={onConnect}
              className="flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-all active:scale-95"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
