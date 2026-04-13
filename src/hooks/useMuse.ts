import { useState, useEffect, useCallback } from 'react';

export interface Muse {
  user_address: string;
  name: string;
  level: number;
  exp: number;
  charm: number;
  talent: number;
  fanbase: number;
  skin_id: string;
  background_id: string;
}

export interface MissionProgress {
  mission_id: string;
  progress: number;
  completed: number;
}

export function useMuse(address: string | null) {
  const [muse, setMuse] = useState<Muse | null>(null);
  const [missions, setMissions] = useState<MissionProgress[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMuse = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [museRes, missionRes] = await Promise.all([
        fetch(`/api/muse/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        }),
        fetch(`/api/muse/missions/${address}`)
      ]);

      if (museRes.ok) {
     const contentType = museRes.headers.get("content-type");
       if (contentType && contentType.includes("application/json")) {
        const data = await museRes.json();
        setMuse(data);
        } else {
       console.warn("Muse API가 JSON을 반환하지 않았습니다. (404 가능성)");
  }
}
     if (missionRes.ok) {
      const contentType = missionRes.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
       const data = await missionRes.json();
       setMissions(Array.isArray(data) ? data : []);
     }
}
    } catch (error) {
      console.error('Failed to fetch Muse data:', error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchMuse();
  }, [fetchMuse]);

  const updateName = async (name: string) => {
    if (!address) return;
    try {
      const res = await fetch('/api/muse/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, name }),
      });
      if (res.ok) {
        setMuse(prev => prev ? { ...prev, name } : null);
      }
    } catch (error) {
      console.error('Failed to update Muse name:', error);
    }
  };

  const interact = async (toAddress: string, message: string) => {
    if (!address) return;
    try {
      const res = await fetch('/api/muse/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: address, to: toAddress, message }),
      });
      if (res.ok) {
        await fetchMuse();
      }
    } catch (error) {
      console.error('Failed to interact:', error);
    }
  };

  return {
    muse,
    missions,
    loading,
    refresh: fetchMuse,
    updateName,
    interact,
  };
}