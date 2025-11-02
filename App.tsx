import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Observer, Guild, SimulationParams, SimulationStats, Candle } from './types';
import { DEFAULT_SIMULATION_PARAMS, SIMULATION_SPEED_MS, PRIMES } from './constants';
import { getRandomInt, calculateReward, calculateEmbedding } from './services/simulationService';
import { fetchMarketData } from './services/marketDataService';
import ControlPanel from './components/ControlPanel';
import HilbertSpaceView from './components/HilbertSpaceView';
import InfoPanel from './components/InfoPanel';
import MarketView from './components/EnvironmentView';
import GuildDynamicsView from './components/GuildDynamicsView';

const App: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_SIMULATION_PARAMS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [currentTimeStep, setCurrentTimeStep] = useState(60);
  const [stats, setStats] = useState<SimulationStats>({
    timeStep: 0,
    currentPrice: 0,
    bestPrediction: 0,
    predictionError: 0,
  });
  const [phaseHistory, setPhaseHistory] = useState<Array<Record<string, number>>>([]);
  
  // State for handling async data fetching
  const [marketData, setMarketData] = useState<Candle[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const simulationIntervalRef = useRef<number | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const loadMarketData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchMarketData();
        setMarketData(data);
      } catch (err) {
        setError("Failed to load market data. The API may be down or your connection is offline.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadMarketData();
  }, []);

  const initializeSimulation = useCallback(() => {
    if (!marketData) return;

    setCurrentTimeStep(60);
    const initialPrice = marketData[59].close;

    const initialCollectivePhase = PRIMES.reduce((acc, p) => {
      acc[p] = 0;
      return acc;
    }, {} as { [prime: number]: number });
    
    const searchRange = initialPrice * 0.1;

    const observers: Observer[] = Array.from({ length: params.numObservers }, (_, i) => {
      const n = initialPrice + getRandomInt(-searchRange, searchRange);
      const { reward, error } = calculateReward(n, marketData[60].close);
      const embedding = calculateEmbedding(n, initialCollectivePhase);
      return { id: i, n, reward, error, embedding };
    });

    setGuild({
      id: 'main-guild',
      collectivePhaseVector: initialCollectivePhase,
      observers,
      eliteN: null,
      eliteReward: -1,
    });

    setStats({
      timeStep: 0,
      currentPrice: initialPrice,
      bestPrediction: 0,
      predictionError: 0,
    });
    
    setPhaseHistory([]);
  }, [params, marketData]);

  // Initialize simulation when data is loaded or params are reset
  useEffect(() => {
    if(marketData) {
      initializeSimulation();
    }
  }, [params.resetToken, initializeSimulation, marketData]);

  const runSimulationStep = useCallback(() => {
    if (!marketData) return;

    setCurrentTimeStep(prevStep => {
      const nextStep = prevStep + 1;
      if (nextStep >= marketData.length -1) {
        setIsRunning(false); // Stop at the end of data
        return prevStep;
      }
      
      const actualNextClose = marketData[nextStep].close;

      setGuild(prevGuild => {
        if (!prevGuild) return null;

        const evaluatedObservers = prevGuild.observers.map(obs => {
          const { reward, error } = calculateReward(obs.n, actualNextClose);
          return { ...obs, reward, error };
        });

        const eliteObserver = evaluatedObservers.reduce((best, current) => 
          current.reward > best.reward ? current : best
        );
        
        const newEliteN = eliteObserver.n;
        const newEliteReward = eliteObserver.reward;

        const newCollectivePhaseVector = { ...prevGuild.collectivePhaseVector };
        for (const p of PRIMES) {
          const oldPhase = prevGuild.collectivePhaseVector[p];
          const eliteMod = Math.round(newEliteN) % p;
          newCollectivePhaseVector[p] = (1 - params.learningRate) * oldPhase + params.learningRate * eliteMod;
        }

        const nextPriceContext = actualNextClose;
        const searchRange = nextPriceContext * 0.1;

        const updatedObservers = evaluatedObservers.map(obs => {
          let newN = obs.n;
          if (obs.id !== eliteObserver.id) {
              const moveProbability = 1.0 - obs.reward;
              if (Math.random() < moveProbability) {
                  const direction = Math.sign(newEliteN - obs.n);
                  const step = Math.random() * Math.abs(newEliteN - obs.n) * 0.5;
                  newN += direction * step;
              }
          }
          if (Math.random() < params.mutationRate) {
              const mutationAmount = getRandomInt(-searchRange / 2, searchRange / 2);
              newN = nextPriceContext + mutationAmount;
          }
          
          const newEmbedding = calculateEmbedding(newN, newCollectivePhaseVector);
          return { ...obs, n: newN, embedding: newEmbedding };
        });

        setStats({
            timeStep: nextStep - 60,
            currentPrice: actualNextClose,
            bestPrediction: newEliteN,
            predictionError: eliteObserver.error,
        });
        
        setPhaseHistory(prevHistory => [
            ...prevHistory.slice(-99), 
            { generation: nextStep - 60, ...newCollectivePhaseVector }
        ]);
        
        return {
          ...prevGuild,
          observers: updatedObservers,
          collectivePhaseVector: newCollectivePhaseVector,
          eliteN: newEliteN,
          eliteReward: newEliteReward,
        };
      });

      return nextStep;
    });
  }, [params, marketData]);

  useEffect(() => {
    if (isRunning && marketData) {
      simulationIntervalRef.current = window.setInterval(runSimulationStep, SIMULATION_SPEED_MS);
    } else {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    }
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [isRunning, runSimulationStep, marketData]);

  const renderContent = () => {
    if (isLoading) {
        return <div className="text-center text-xl text-cyan-400">Loading Real Bitcoin Market Data...</div>
    }
    if (error) {
        return <div className="text-center text-xl text-red-400 bg-red-900/50 p-6 rounded-lg">{error}</div>
    }
    if (guild && marketData) {
      const eliteObserver = guild.observers.find(o => o.n === guild.eliteN);
      return (
         <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 flex flex-col gap-6">
                <ControlPanel params={params} setParams={setParams} isRunning={isRunning} setIsRunning={setIsRunning} />
                <InfoPanel stats={stats} />
            </div>
            <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="h-96">
                   <MarketView observers={guild.observers} marketData={marketData} currentTimeStep={currentTimeStep} eliteN={guild.eliteN} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
                    <div className="h-[45vh] min-h-[350px]">
                        <HilbertSpaceView embedding={eliteObserver?.embedding ?? null} eliteN={guild.eliteN ?? null} />
                    </div>
                    <div className="h-[45vh] min-h-[350px]">
                        <GuildDynamicsView history={phaseHistory} />
                    </div>
                </div>
            </div>
        </main>
      )
    }
    return null;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-900 font-sans">
        <header className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Observer Ecology Simulation</h1>
            <p className="mt-2 text-lg text-cyan-400">Predicting Bitcoin Price with Prime-Hilbert Learning Systems</p>
        </header>
        {renderContent()}
    </div>
  );
};

export default App;