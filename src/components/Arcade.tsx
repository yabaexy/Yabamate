import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Pause, Gamepad2, X } from 'lucide-react';

// --- Tetris ---
const TETRIS_COLS = 10;
const TETRIS_ROWS = 20;
const TETROMINOS = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: 'bg-cyan-400' },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: 'bg-blue-500' },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: 'bg-orange-500' },
  O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-400' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 'bg-green-500' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 'bg-purple-500' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 'bg-red-500' },
};

const Tetris: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [grid, setGrid] = useState(Array(TETRIS_ROWS).fill(null).map(() => Array(TETRIS_COLS).fill(0)));
  const [activePiece, setActivePiece] = useState<any>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const gameLoopRef = useRef<any>(null);

  const spawnPiece = useCallback(() => {
    const keys = Object.keys(TETROMINOS);
    const type = keys[Math.floor(Math.random() * keys.length)] as keyof typeof TETROMINOS;
    const piece = TETROMINOS[type];
    const newPos = { x: Math.floor(TETRIS_COLS / 2) - Math.floor(piece.shape[0].length / 2), y: 0 };
    
    // Check collision on spawn
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] && grid[newPos.y + r]?.[newPos.x + c] !== 0) {
          setGameOver(true);
          onComplete();
          return;
        }
      }
    }
    
    setActivePiece(piece);
    setPos(newPos);
  }, [grid, onComplete]);

  const checkCollision = (newX: number, newY: number, shape: number[][]) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          if (newX + c < 0 || newX + c >= TETRIS_COLS || newY + r >= TETRIS_ROWS || (newY + r >= 0 && grid[newY + r][newX + c] !== 0)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const move = (dx: number, dy: number) => {
    if (gameOver || paused || !activePiece) return;
    if (!checkCollision(pos.x + dx, pos.y + dy, activePiece.shape)) {
      setPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      return true;
    }
    if (dy > 0) {
      lockPiece();
    }
    return false;
  };

  const rotate = () => {
    if (gameOver || paused || !activePiece) return;
    const rotated = activePiece.shape[0].map((_: any, i: number) => activePiece.shape.map((row: any) => row[i]).reverse());
    if (!checkCollision(pos.x, pos.y, rotated)) {
      setActivePiece({ ...activePiece, shape: rotated });
    }
  };

  const lockPiece = () => {
    const newGrid = grid.map(row => [...row]);
    activePiece.shape.forEach((row: any, r: number) => {
      row.forEach((cell: number, c: number) => {
        if (cell) {
          if (pos.y + r >= 0) {
            newGrid[pos.y + r][pos.x + c] = activePiece.color;
          }
        }
      });
    });

    // Clear lines
    let linesCleared = 0;
    const filteredGrid = newGrid.filter(row => {
      const isFull = row.every(cell => cell !== 0);
      if (isFull) linesCleared++;
      return !isFull;
    });
    
    while (filteredGrid.length < TETRIS_ROWS) {
      filteredGrid.unshift(Array(TETRIS_COLS).fill(0));
    }

    setGrid(filteredGrid);
    setScore(prev => prev + (linesCleared * 100));
    spawnPiece();
  };

  useEffect(() => {
    if (!activePiece && !gameOver) spawnPiece();
  }, [activePiece, gameOver, spawnPiece]);

  useEffect(() => {
    if (gameOver || paused) return;
    gameLoopRef.current = setInterval(() => move(0, 1), 800);
    return () => clearInterval(gameLoopRef.current);
  }, [gameOver, paused, activePiece, pos, grid]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex justify-between w-full max-w-[300px]">
        <div className="text-sm font-bold text-zinc-500">Score: <span className="text-zinc-900">{score}</span></div>
        <div className="flex gap-2">
          <button onClick={() => setPaused(!paused)} className="p-1 hover:bg-zinc-100 rounded-lg">
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button onClick={() => { setGrid(Array(TETRIS_ROWS).fill(null).map(() => Array(TETRIS_COLS).fill(0))); setGameOver(false); setScore(0); setActivePiece(null); }} className="p-1 hover:bg-zinc-100 rounded-lg">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
      
      <div className="relative border-4 border-zinc-900 bg-zinc-100 w-[200px] h-[400px] grid grid-cols-10 grid-rows-20">
        {grid.map((row, r) => row.map((cell, c) => (
          <div key={`${r}-${c}`} className={`border-[0.5px] border-zinc-200/50 ${cell || 'bg-transparent'}`} />
        )))}
        {activePiece && activePiece.shape.map((row: any, r: number) => row.map((cell: number, c: number) => (
          cell ? <div key={`active-${r}-${c}`} className={`absolute w-[20px] h-[20px] border-[0.5px] border-white/20 ${activePiece.color}`} style={{ left: (pos.x + c) * 20, top: (pos.y + r) * 20 }} /> : null
        )))}
        {gameOver && (
          <div className="absolute inset-0 bg-zinc-900/80 flex flex-col items-center justify-center text-white">
            <h3 className="text-xl font-black">GAME OVER</h3>
            <p className="text-sm opacity-70">Final Score: {score}</p>
            <button onClick={() => { setGrid(Array(TETRIS_ROWS).fill(null).map(() => Array(TETRIS_COLS).fill(0))); setGameOver(false); setScore(0); setActivePiece(null); }} className="mt-4 bg-white text-zinc-900 px-4 py-2 rounded-full text-xs font-bold">Try Again</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
        <div />
        <button onClick={() => rotate()} className="bg-zinc-900 text-white p-3 rounded-xl flex justify-center"><RotateCcw size={20} /></button>
        <div />
        <button onClick={() => move(-1, 0)} className="bg-zinc-900 text-white p-3 rounded-xl flex justify-center">←</button>
        <button onClick={() => move(0, 1)} className="bg-zinc-900 text-white p-3 rounded-xl flex justify-center">↓</button>
        <button onClick={() => move(1, 0)} className="bg-zinc-900 text-white p-3 rounded-xl flex justify-center">→</button>
      </div>
    </div>
  );
};

// --- Pong ---
const Pong: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState(false);
  const ballRef = useRef({ x: 300, y: 200, dx: 4, dy: 4, radius: 8 });
  const p1Ref = useRef({ y: 150, height: 80, width: 10 });
  const p2Ref = useRef({ y: 150, height: 80, width: 10 });
  const gameLoopRef = useRef<any>(null);

  const update = useCallback(() => {
    const ball = ballRef.current;
    const p1 = p1Ref.current;
    const p2 = p2Ref.current;

    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision
    if (ball.y + ball.radius > 400 || ball.y - ball.radius < 0) ball.dy *= -1;

    // Paddle collision
    if (ball.x - ball.radius < 20 && ball.y > p1.y && ball.y < p1.y + p1.height) {
      ball.dx *= -1.1;
      ball.x = 20 + ball.radius;
    }
    if (ball.x + ball.radius > 580 && ball.y > p2.y && ball.y < p2.y + p2.height) {
      ball.dx *= -1.1;
      ball.x = 580 - ball.radius;
    }

    // AI
    if (p2.y + p2.height / 2 < ball.y) p2.y += 3.5;
    else p2.y -= 3.5;

    // Scoring
    if (ball.x < 0) {
      setScore(prev => ({ ...prev, p2: prev.p2 + 1 }));
      resetBall();
    } else if (ball.x > 600) {
      setScore(prev => ({ ...prev, p1: prev.p1 + 1 }));
      resetBall();
    }

    if (score.p1 >= 5 || score.p2 >= 5) {
      setGameOver(true);
      onComplete();
    }
  }, [score, onComplete]);

  const resetBall = () => {
    ballRef.current = { x: 300, y: 200, dx: 4 * (Math.random() > 0.5 ? 1 : -1), dy: 4 * (Math.random() > 0.5 ? 1 : -1), radius: 8 };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 600, 400);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(300, 0);
    ctx.lineTo(300, 400);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.fillRect(10, p1Ref.current.y, p1Ref.current.width, p1Ref.current.height);
    ctx.fillRect(580, p2Ref.current.y, p2Ref.current.width, p2Ref.current.height);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const root = document.documentElement;
      const mouseY = e.clientY - rect.top - root.scrollTop;
      p1Ref.current.y = mouseY - p1Ref.current.height / 2;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (gameOver) return;
    const loop = () => {
      update();
      draw();
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [update, draw, gameOver]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex justify-center gap-12 text-2xl font-black text-zinc-900">
        <span>{score.p1}</span>
        <span className="text-zinc-300">-</span>
        <span>{score.p2}</span>
      </div>
      <canvas ref={canvasRef} width={600} height={400} className="w-full max-w-[500px] rounded-2xl shadow-xl bg-zinc-900 cursor-none" />
      {gameOver && (
        <div className="text-center">
          <h3 className="text-xl font-black text-zinc-900">{score.p1 > score.p2 ? 'YOU WIN!' : 'AI WINS!'}</h3>
          <button onClick={() => { setScore({ p1: 0, p2: 0 }); setGameOver(false); resetBall(); }} className="mt-4 bg-zinc-900 text-white px-6 py-2 rounded-full text-sm font-bold">Rematch</button>
        </div>
      )}
      <p className="text-xs text-zinc-400">Move your mouse to control the left paddle</p>
    </div>
  );
};

// --- Backgammon (Simplified) ---
const Backgammon: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [dice, setDice] = useState<number[]>([1, 1]);
  const [turn, setTurn] = useState<'white' | 'black'>('white');
  const [board, setBoard] = useState<any[]>(Array(24).fill(null).map((_, i) => {
    if (i === 0) return { count: 2, color: 'white' };
    if (i === 5) return { count: 5, color: 'black' };
    if (i === 7) return { count: 3, color: 'black' };
    if (i === 11) return { count: 5, color: 'white' };
    if (i === 12) return { count: 5, color: 'black' };
    if (i === 16) return { count: 3, color: 'white' };
    if (i === 18) return { count: 5, color: 'white' };
    if (i === 23) return { count: 2, color: 'black' };
    return null;
  }));
  const [selected, setSelected] = useState<number | null>(null);

  const rollDice = () => {
    setDice([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
    onComplete(); // Simplified: just rolling dice completes the daily task for now
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <div className="flex gap-4">
        {dice.map((d, i) => (
          <div key={i} className="w-12 h-12 bg-white border-2 border-zinc-200 rounded-xl flex items-center justify-center text-xl font-black shadow-sm">
            {d}
          </div>
        ))}
      </div>
      
      <div className="w-full max-w-[500px] aspect-[3/2] bg-[#8b4513] rounded-xl p-4 grid grid-cols-12 gap-1 border-8 border-[#5d2e0d] shadow-2xl relative">
        <div className="absolute inset-y-0 left-1/2 w-4 bg-[#5d2e0d] -translate-x-1/2 z-10" />
        {Array(24).fill(0).map((_, i) => {
          const isTop = i < 12;
          const index = isTop ? 11 - i : i - 12;
          const point = board[index];
          return (
            <div key={i} className={`relative flex flex-col ${isTop ? 'justify-start' : 'justify-end'} items-center`}>
              <div className={`w-full h-full ${i % 2 === 0 ? 'bg-[#d2b48c]' : 'bg-[#f5f5dc]'} clip-path-triangle-${isTop ? 'down' : 'up'}`} />
              {point && (
                <div className="absolute inset-x-0 flex flex-col items-center gap-1 p-1">
                  {Array(Math.min(point.count, 5)).fill(0).map((_, j) => (
                    <div key={j} className={`w-6 h-6 rounded-full border-2 ${point.color === 'white' ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`} />
                  ))}
                  {point.count > 5 && <span className="text-[10px] font-bold text-zinc-500">+{point.count - 5}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <div className={`px-4 py-2 rounded-full text-sm font-bold ${turn === 'white' ? 'bg-white text-zinc-900 ring-2 ring-emerald-500' : 'bg-zinc-100 text-zinc-400'}`}>White's Turn</div>
        <button onClick={rollDice} className="bg-zinc-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-zinc-800 transition-all active:scale-95">ROLL DICE</button>
        <div className={`px-4 py-2 rounded-full text-sm font-bold ${turn === 'black' ? 'bg-zinc-900 text-white ring-2 ring-emerald-500' : 'bg-zinc-100 text-zinc-400'}`}>Black's Turn</div>
      </div>
      <p className="text-xs text-zinc-400 text-center">Simplified Backgammon: Roll the dice to complete your daily task!</p>
    </div>
  );
};

// --- Main Arcade Component ---
export const Arcade: React.FC<{ account: string | null; onGamePlayed: (game: 'tetris' | 'pong' | 'backgammon') => void }> = ({ account, onGamePlayed }) => {
  const [activeGame, setActiveGame] = useState<'tetris' | 'pong' | 'backgammon' | null>(null);
  const [rankings, setRankings] = useState<any[]>([]);

  useEffect(() => {
    if (activeGame) {
      fetch(`/api/rankings/${activeGame}`)
        .then(res => res.json())
        .then(data => setRankings(data));
    }
  }, [activeGame]);

  const handleGameComplete = async (gameId: string, score: number = 0) => {
    if (account) {
      await fetch('/api/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, address: account, score }),
      });
      
      // Refresh rankings
      const res = await fetch(`/api/rankings/${gameId}`);
      const data = await res.json();
      setRankings(data);
    }
    onGamePlayed(gameId as any);
  };

  const games = [
    { id: 'tetris', name: 'Tetris', icon: Gamepad2, color: 'bg-emerald-500', desc: 'Stack blocks and clear lines' },
    { id: 'pong', name: 'Pong', icon: Play, color: 'bg-blue-500', desc: 'Classic paddle vs ball' },
    { id: 'backgammon', name: 'Backgammon', icon: RotateCcw, color: 'bg-amber-600', desc: 'Strategic board game' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-900">Yabamate Arcade</h1>
        <p className="text-zinc-500">Play games to earn YMP. Play all three daily for a bonus!</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {games.map((game) => (
          <div 
            key={game.id}
            onClick={() => setActiveGame(game.id as any)}
            className="group cursor-pointer overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
          >
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${game.color} text-white`}>
              <game.icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">{game.name}</h3>
            <p className="text-sm text-zinc-500">{game.desc}</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
              Play Now <ArrowRightLeft className="h-3 w-3" />
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {activeGame && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveGame(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${games.find(g => g.id === activeGame)?.color} text-white`}>
                    <Gamepad2 size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900">{games.find(g => g.id === activeGame)?.name}</h2>
                </div>
                <button onClick={() => setActiveGame(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex items-center justify-center bg-zinc-50 rounded-2xl p-4">
                  {activeGame === 'tetris' && <Tetris onComplete={() => handleGameComplete('tetris', 100)} />}
                  {activeGame === 'pong' && <Pong onComplete={() => handleGameComplete('pong', 50)} />}
                  {activeGame === 'backgammon' && <Backgammon onComplete={() => handleGameComplete('backgammon', 200)} />}
                </div>
                
                <div className="space-y-6">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      <h3 className="font-bold text-zinc-900">Leaderboard</h3>
                    </div>
                    <div className="space-y-2">
                      {rankings.length > 0 ? rankings.map((r, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-zinc-50 p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-zinc-400">#{i + 1}</span>
                            <span className="text-sm font-medium text-zinc-900">
                              {r.username || r.user_address.slice(0, 6) + '...' + r.user_address.slice(-4)}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">{r.score}</span>
                        </div>
                      )) : (
                        <p className="text-center text-xs text-zinc-500 py-4">No rankings yet. Be the first!</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="rounded-2xl bg-emerald-50 p-6">
                    <h4 className="text-sm font-bold text-emerald-900">Daily Mission</h4>
                    <p className="mt-1 text-xs text-emerald-700">Play all 3 games today to earn a 10 YMP bonus!</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ArrowRightLeft: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
);
