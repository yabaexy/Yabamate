import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  Heart, 
  Music, 
  Users, 
  Trophy, 
  Calendar, 
  ChevronRight, 
  Edit2, 
  CheckCircle2, 
  Clock,
  Sparkles,
  Award
} from 'lucide-react';
import { useMuse } from '../hooks/useMuse';
import { cn } from '../lib/utils';

interface MuseDashboardProps {
  account: string;
}

export const MuseDashboard: React.FC<MuseDashboardProps> = ({ account }) => {
  const { muse, missions, loading, updateName, refresh } = useMuse(account);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  if (loading || !muse) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const getCharacterImage = () => {
    const seed = muse.name || 'default';
    if (muse.level < 30) return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&scale=120&translateY=10`;
    if (muse.level < 50) return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&scale=100`;
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&scale=90&translateY=-5`;
  };

  const getLevelTier = () => {
    if (muse.level < 30) return "Child Prodigy";
    if (muse.level < 50) return "Rising Idol";
    return "Superstar Muse";
  };

  const dailyMissions = [
    { id: 'daily_sponsor_count', title: 'Sponsor 3+ Creators', reward: '450 YMP', target: 3 },
    { id: 'daily_sponsor_amount', title: 'Sponsor 250+ WYDA', reward: '650 YMP', target: 250 },
    { id: 'daily_interact', title: 'Cheer 5+ Other Muses', reward: '350 YMP', target: 5 },
    { id: 'daily_recurring', title: 'Maintain Recurring Support', reward: '900 YMP', target: 1 },
    { id: 'daily_new_creator', title: 'First Support to New Creator', reward: '550 YMP', target: 1 },
  ];

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      updateName(newName.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Left Column: Character Visuals & Stats */}
        <div className="lg:col-span-5 space-y-6">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white p-8 shadow-xl">
            {/* Background Accent */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-50 blur-3xl opacity-60" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-50 blur-3xl opacity-60" />

            {/* Header */}
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-1.5 text-white">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Lv.{muse.level}</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{getLevelTier()}</p>
              </div>
            </div>

            {/* Character Image */}
            <div className="relative mt-8 flex justify-center">
              <motion.div
                key={muse.level}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative h-64 w-64"
              >
                <img src={getCharacterImage()} alt="Muse" className="h-full w-full" />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-6 py-2 shadow-lg backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    {isEditingName ? (
                      <form onSubmit={handleNameSubmit} className="flex items-center gap-2">
                        <input 
                          autoFocus
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="w-32 border-b border-zinc-300 bg-transparent text-center text-sm font-bold focus:border-emerald-500 focus:outline-none"
                        />
                        <button type="submit"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></button>
                      </form>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-zinc-900">{muse.name}</span>
                        <button onClick={() => { setIsEditingName(true); setNewName(muse.name); }}>
                          <Edit2 className="h-3 w-3 text-zinc-400" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* EXP Bar */}
            <div className="mt-12 space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <span>Experience</span>
                <span>{muse.exp} / {muse.level * 100}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(muse.exp / (muse.level * 100)) * 100}%` }}
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" 
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { label: 'Charm', value: muse.charm, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
                { label: 'Talent', value: muse.talent, icon: Music, color: 'text-purple-500', bg: 'bg-purple-50' },
                { label: 'Fanbase', value: muse.fanbase, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
              ].map((stat, i) => (
                <div key={i} className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 text-center">
                  <div className={cn("mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl", stat.bg)}>
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{stat.label}</p>
                  <p className="text-lg font-black text-zinc-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skins Preview */}
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-900">Wardrobe</h3>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">30+ Skins Available</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-zinc-200" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Missions & Achievements */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Daily Missions */}
          <div className="rounded-[2.5rem] border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Daily Muse Missions</h2>
                <p className="text-sm text-zinc-500">Complete tasks to earn YMP and grow your Muse</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Calendar className="h-6 w-6" />
              </div>
            </div>

            <div className="space-y-4">
              {dailyMissions.map((mission) => {
                const progress = missions.find(m => m.mission_id === mission.id);
                const isCompleted = progress?.completed === 1;
                const currentProgress = progress?.progress || 0;

                return (
                  <div 
                    key={mission.id}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border p-5 transition-all",
                      isCompleted ? "border-emerald-100 bg-emerald-50/30" : "border-zinc-100 bg-white hover:border-zinc-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          isCompleted ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"
                        )}>
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900">{mission.title}</h4>
                          <p className="text-xs font-bold text-emerald-600">{mission.reward}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-zinc-900">{currentProgress} / {mission.target}</p>
                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100">
                          <div 
                            className={cn("h-full transition-all duration-500", isCompleted ? "bg-emerald-500" : "bg-zinc-300")}
                            style={{ width: `${Math.min(100, (currentProgress / mission.target) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly & Achievements */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-zinc-900">Weekly Challenge</h3>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl bg-zinc-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Support</p>
                  <p className="text-sm font-bold text-zinc-900">0 / 1,800 WYDA</p>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Creators Supported</p>
                  <p className="text-sm font-bold text-zinc-900">0 / 10</p>
                </div>
              </div>
              <button className="mt-4 w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-all">
                View Ranking
              </button>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Award className="h-5 w-5 text-blue-500" />
                <h3 className="font-bold text-zinc-900">Achievements</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-square rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center opacity-40">
                    <Star className="h-4 w-4 text-zinc-300" />
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all">
                All 70+ Badges <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
