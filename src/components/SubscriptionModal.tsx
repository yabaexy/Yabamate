import React, { useState } from 'react';
import { Creator, Tier } from '../types';
import { X, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SubscriptionModalProps {
  creator: Creator | null;
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (tier: Tier, months: number) => Promise<void>;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  creator,
  isOpen,
  onClose,
  onSubscribe,
}) => {
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!creator) return null;

  const handleSubscribe = async () => {
    if (!selectedTier) return;
    setLoading(true);
    try {
      await onSubscribe(selectedTier, months);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 p-6">
              <div className="flex items-center gap-3">
                <img
                  src={creator.avatarUrl}
                  alt={creator.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Support {creator.name}</h2>
                  <p className="text-sm text-zinc-500">Choose a tier to get started</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {creator.tiers.map((tier) => (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedTier(tier)}
                    className={cn(
                      "relative cursor-pointer rounded-2xl border-2 p-5 transition-all",
                      selectedTier?.id === tier.id
                        ? "border-emerald-500 bg-emerald-50/30"
                        : "border-zinc-100 hover:border-zinc-200"
                    )}
                  >
                    {selectedTier?.id === tier.id && (
                      <div className="absolute right-4 top-4 rounded-full bg-emerald-500 p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <h3 className="font-bold text-zinc-900">{tier.name}</h3>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-zinc-900">{tier.price}</span>
                      <span className="text-sm font-medium text-zinc-500">
                        WYDA / {tier.period === 'Monthly' ? 'mo' : tier.period === 'Quarterly' ? 'qtr' : 'yr'}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-zinc-500">{tier.description}</p>
                    <ul className="mt-4 space-y-2">
                      {tier.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-600">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {selectedTier && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-8 space-y-6 border-t border-zinc-100 pt-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-bold text-zinc-900">Subscription Duration</label>
                      <p className="text-xs text-zinc-500">How many months would you like to pre-fund?</p>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-1">
                      {[1, 3, 6, 12].map((m) => (
                        <button
                          key={m}
                          onClick={() => setMonths(m)}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                            months === m
                              ? "bg-zinc-900 text-white"
                              : "text-zinc-500 hover:bg-zinc-100"
                          )}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600">Total to Escrow</span>
                      <span className="text-lg font-black text-zinc-900">
                        {selectedTier.price * months} WYDA
                      </span>
                    </div>
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-[10px] text-emerald-800">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <p>
                        Your funds are held in a secure escrow contract. {selectedTier.price} WYDA will be released to the creator every 30 days. You can cancel and refund the remaining balance at any time.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="w-full rounded-2xl bg-zinc-900 py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? "Processing..." : `Confirm Subscription (${selectedTier.price * months} WYDA)`}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
