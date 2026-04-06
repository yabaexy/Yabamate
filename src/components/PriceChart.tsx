import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWydaPrice } from '../hooks/useWydaPrice';

export const PriceChart: React.FC = () => {
  const { price: currentPrice } = useWydaPrice();

  const chartData = useMemo(() => {
    const baseData = [
      { time: '00:00', price: currentPrice * 0.85 },
      { time: '04:00', price: currentPrice * 0.88 },
      { time: '08:00', price: currentPrice * 0.92 },
      { time: '12:00', price: currentPrice * 0.95 },
      { time: '16:00', price: currentPrice * 0.98 },
      { time: '20:00', price: currentPrice * 0.97 },
      { time: 'Now', price: currentPrice },
    ];
    return baseData;
  }, [currentPrice]);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            dy={10}
          />
          <YAxis 
            hide 
            domain={['dataMin - 0.05', 'dataMax + 0.05']}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '12px'
            }}
            formatter={(value: number) => [`$${value.toFixed(4)}`, 'Price']}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#10b981" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
