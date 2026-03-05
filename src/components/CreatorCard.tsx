import React from 'react';
import { Creator } from '../types';
import { Users, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface CreatorCardProps {
  creator: Creator;
  onClick: () => void;
}

export const CreatorCard: React.FC<CreatorCardProps> = ({ creator, onClick }) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:shadow-xl"
      onClick={onClick}
    >
      <div className="relative h-32 w-full">
        <img
          src={creator.coverUrl}
          alt={creator.name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute -bottom-6 left-6 h-16 w-16 overflow-hidden rounded-xl border-4 border-white bg-white shadow-sm">
          <img
            src={creator.avatarUrl}
            alt={creator.name}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
      
      <div className="p-6 pt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">
            {creator.name}
          </h3>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {creator.category}
          </span>
        </div>
        
        <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
          {creator.bio}
        </p>

        <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">1.2k supporters</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-zinc-900">
            <span>From {Math.min(...creator.tiers.map(t => t.price))} Yabamate</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
