import { useState, useEffect } from 'react';

export function useWydaPrice() {
  const [price, setPrice] = useState(1.25);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/0xd84b7e8b295d9fa9656527ac33bf4f683ae7d2c4');
        const data = await response.json();
        const priceUsd = data.pairs?.[0]?.priceUsd;
        if (priceUsd) {
          setPrice(parseFloat(priceUsd));
        }
      } catch (error) {
        console.error('Failed to fetch WYDA price:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  return { price, loading };
}
