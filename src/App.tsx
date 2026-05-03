/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { compile } from 'mathjs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Square, Settings2, Activity, Volume2, Calculator, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [equation, setEquation] = useState('sin(x) * x');
  const [xMin, setXMin] = useState(-10);
  const [xMax, setXMax] = useState(10);
  const [duration, setDuration] = useState(5);
  const [oscType, setOscType] = useState<OscillatorType>('sine');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Generate data points whenever inputs change
  const { points, yMin, yMax } = useMemo(() => {
    try {
      const expr = compile(equation);
      const newPoints = [];
      let min = Infinity;
      let max = -Infinity;
      
      const numPoints = 300;
      for (let i = 0; i <= numPoints; i++) {
        const x = xMin + (xMax - xMin) * (i / numPoints);
        const y = expr.evaluate({ x });
        if (typeof y !== 'number' || isNaN(y) || !isFinite(y)) {
           throw new Error('Function must evaluate to a finite number');
        }
        if (y < min) min = y;
        if (y > max) max = y;
        // Format to 3 decimal places for tooltip
        newPoints.push({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
      }
      
      if (min === max) {
         min -= 1;
         max += 1;
      }
      
      setError(null);
      return { points: newPoints, yMin: min, yMax: max };
    } catch (err: any) {
      setError(err.message || 'Invalid mathematical function');
      return { points: [], yMin: 0, yMax: 1 };
    }
  }, [equation, xMin, xMax]);

  const stopAudio = () => {
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch (e) {}
      oscRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
  };

  const playAudio = () => {
    if (points.length === 0 || error) return;
    
    stopAudio();

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = oscType;
    oscRef.current = oscillator;

    const startTime = audioCtx.currentTime + 0.05;
    
    // Map Y to frequency (e.g., 200Hz to 1200Hz)
    const outMin = 200;
    const outMax = 1200;

    points.forEach((pt, i) => {
      const t = startTime + (i / (points.length - 1)) * duration;
      const freqValue = ((pt.y - yMin) * (outMax - outMin)) / (yMax - yMin) + outMin;
      const safeFreq = Math.max(20, Math.min(20000, freqValue));
      
      if (i === 0) {
        oscillator.frequency.setValueAtTime(safeFreq, t);
      } else {
        oscillator.frequency.linearRampToValueAtTime(safeFreq, t);
      }
    });

    // Fade in/out to prevent clicks
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
    gainNode.gain.setValueAtTime(0.5, startTime + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);

    setIsPlaying(true);

    const animate = () => {
      if (!audioCtxRef.current) return;
      
      const elapsed = audioCtxRef.current.currentTime - startTime;
      const p = Math.max(0, Math.min(1, elapsed / duration));
      
      setProgress(p * 100);

      if (elapsed < duration) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };
    
    animFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return stopAudio;
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 font-sans flex flex-col selection:bg-indigo-500/30">
      <header className="px-6 py-4 border-b border-neutral-800/60 bg-neutral-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center space-x-3">
          <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400 border border-indigo-500/20 shadow-inner">
            <Activity className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 to-neutral-400">
            Math Sonifier
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 sm:p-6 sm:gap-8 gap-6">
        
        {/* Controls Sidebar */}
        <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          
          {/* Main Equation Panel */}
          <div className="bg-neutral-900/60 p-5 rounded-2xl border border-neutral-800/80 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50"></div>
            
            <div className="flex items-center space-x-2 text-neutral-300 mb-4 font-medium">
              <Calculator className="w-4 h-4 text-indigo-400" />
              <h2>Function f(x)</h2>
            </div>
            
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none font-mono">
                f(x) =
              </div>
              <input 
                type="text" 
                value={equation}
                onChange={(e) => setEquation(e.target.value)}
                className={cn(
                  "w-full bg-neutral-950 border rounded-xl py-3 pl-[3.5rem] pr-4 text-neutral-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors shadow-inner",
                  error ? "border-red-500/50 focus:ring-red-500/50" : "border-neutral-800"
                )}
                placeholder="sin(x) * x"
              />
            </div>
            {error && (
              <div className="mt-2 text-xs text-red-400 flex items-start space-x-1 border border-red-500/20 bg-red-500/10 p-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-xs text-neutral-500 font-medium mb-1.5 block">X Min</label>
                <input 
                  type="number" 
                  value={xMin}
                  onChange={(e) => setXMin(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-neutral-200 text-sm focus:outline-none focus:ring-2 focus:border-neutral-700 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 font-medium mb-1.5 block">X Max</label>
                <input 
                  type="number" 
                  value={xMax}
                  onChange={(e) => setXMax(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-neutral-200 text-sm focus:outline-none focus:ring-2 focus:border-neutral-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Audio Settings Panel */}
          <div className="bg-neutral-900/60 p-5 rounded-2xl border border-neutral-800/80 shadow-xl">
             <div className="flex items-center space-x-2 text-neutral-300 mb-4 font-medium">
              <Settings2 className="w-4 h-4 text-purple-400" />
              <h2>Audio Settings</h2>
            </div>

            <div className="mb-4">
              <label className="text-xs text-neutral-500 font-medium mb-2.5 flex justify-between">
                <span>Duration (Seconds)</span>
                <span className="text-neutral-400">{duration}s</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            <div className="mb-2">
              <label className="text-xs text-neutral-500 font-medium mb-2.5 block">Waveform</label>
              <div className="grid grid-cols-4 gap-2 bg-neutral-950 p-1.5 rounded-lg border border-neutral-800">
                {(['sine', 'square', 'sawtooth', 'triangle'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setOscType(type)}
                    className={cn(
                      "py-1.5 px-2 rounded-md justify-center flex items-center text-xs font-medium capitalize transition-all",
                      oscType === type 
                        ? "bg-neutral-800 text-white shadow-sm" 
                        : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900"
                    )}
                  >
                    {type === 'sine' ? 'â¿' : type === 'square' ? 'â' : type === 'sawtooth' ? 'âª' : 'â³'} 
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-auto pb-4">
            <button
               onClick={isPlaying ? stopAudio : playAudio}
               disabled={!!error || points.length === 0}
               className={cn(
                 "w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg group relative overflow-hidden",
                 isPlaying 
                   ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50" 
                   : "bg-neutral-100 text-neutral-900 hover:bg-white hover:scale-[1.02] border border-transparent disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100"
               )}
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
              {isPlaying ? (
                <>
                  <Square className="w-5 h-5 fill-current" />
                  <span>Stop Sound</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Play Function</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Visualizer Area */}
        <div className="flex-1 flex flex-col min-h-[400px] lg:min-h-0 bg-neutral-900/40 rounded-3xl border border-neutral-800/80 shadow-2xl relative overflow-hidden p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-neutral-400">
               <Activity className="w-4 h-4 text-indigo-400" />
               <span className="font-medium text-sm">Frequency Map Visualization</span>
            </div>
          </div>

          <div className="flex-1 relative w-full h-full min-h-[300px]">
            {points.length > 0 && !error ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis 
                    dataKey="x" 
                    stroke="#525252" 
                    tick={{ fill: '#737373', fontSize: 12 }} 
                    tickFormatter={(val) => Number(val).toFixed(1)} 
                    tickMargin={10}
                    minTickGap={30}
                    domain={['dataMin', 'dataMax']}
                    type="number"
                  />
                  <YAxis 
                    stroke="#525252" 
                    tick={{ fill: '#737373', fontSize: 12 }}
                    domain={['dataMin', 'dataMax']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px', color: '#e5e5e5' }}
                    itemStyle={{ color: '#818cf8', fontWeight: 500 }}
                    labelStyle={{ color: '#a3a3a3', marginBottom: '4px' }}
                    formatter={(value: number) => [value, 'y']}
                    labelFormatter={(label: number) => `x: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="y" 
                    stroke="#818cf8" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorY)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex items-center justify-center text-neutral-600 font-mono text-sm border-2 border-dashed border-neutral-800 rounded-xl">
                 No valid data to display
               </div>
            )}

            {/* Playhead Scrubber */}
            {points.length > 0 && !error && (
              <div 
                 className={cn(
                   "absolute top-0 bottom-6 w-px bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 transition-opacity flex flex-col items-center",
                   isPlaying ? "opacity-100" : "opacity-0"
                 )}
                 style={{ 
                   left: `calc(30px + ${progress}% * calc(100% - 40px) / 100)`, // Roughly matching chart margins
                 }}
              >
                  <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff]"></div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
