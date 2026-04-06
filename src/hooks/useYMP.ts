import { useState, useEffect, useCallback } from 'react';

interface YMPState {
  points: number;
  consecutiveDays: number;
  dailyGamesPlayed: {
    tetris: boolean;
    pong: boolean;
    backgammon: boolean;
  };
}

export const YMP_TO_WYDA_RATE = 1000;

export function useYMP(address: string | null) {
  const [state, setState] = useState<YMPState>({
    points: 0,
    consecutiveDays: 0,
    dailyGamesPlayed: {
      tetris: false,
      pong: false,
      backgammon: false,
    },
  });

  const fetchStatus = useCallback(async () => {
    if (!address) return;
    try {
      const [userRes, dailyRes] = await Promise.all([
        fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        }),
        fetch(`/api/user/daily-status/${address}`)
      ]);

      const user = await userRes.json();
      const daily = await dailyRes.json();

      setState({
        points: user.points,
        consecutiveDays: user.consecutive_days,
        dailyGamesPlayed: daily,
      });
    } catch (e) {
      console.error('Failed to fetch YMP status:', e);
    }
  }, [address]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const checkAttendance = async () => {
    if (!address) return 0;
    try {
      const res = await fetch('/api/user/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.pointsEarned > 0) {
        await fetchStatus();
      }
      return data.pointsEarned;
    } catch (e) {
      console.error('Attendance check failed:', e);
      return 0;
    }
  };

  const markGamePlayed = async (gameId: 'tetris' | 'pong' | 'backgammon') => {
    if (!address) return;
    try {
      const res = await fetch('/api/game/played', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, gameId }),
      });
      const data = await res.json();
      await fetchStatus();
      return data.bonus;
    } catch (e) {
      console.error('Failed to mark game played:', e);
    }
  };

  const spendPoints = async (amount: number) => {
    if (!address || state.points < amount) return false;
    try {
      const res = await fetch('/api/user/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount }),
      });
      if (res.ok) {
        await fetchStatus();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to spend points:', e);
      return false;
    }
  };

  return {
    points: state.points,
    consecutiveDays: state.consecutiveDays,
    dailyGamesPlayed: state.dailyGamesPlayed,
    checkAttendance,
    markGamePlayed,
    spendPoints,
    refresh: fetchStatus,
  };
}
