import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Observer, Guild, SimulationParams, SimulationStats, Candle, TradingStats, Position, TradingSignal, TrainingState, EpochMetrics, ModelCheckpoint } from './types';
import { DEFAULT_SIMULATION_PARAMS, SIMULATION_SPEED_MS, PRIMES, TRAINING_TIMEFRAMES } from './constants';
import { getRandomInt, calculateReward, calculateEmbedding } from './services/simulationService';
import { fetchMarketData } from './services/marketDataService';
import { generateTradingSignal, executeTradingSignal, calculateTradingStats } from './services/tradingService';
import { extractEcologyFeatures } from './services/ecologyFeaturesService';
import { assignTradingCredit, selectTradingElite, getConsensusAction } from './services/rlTradingService';
import {
  calculateFitness,
  evolveObserver,
  mutateStrategyGenes,
  generateLearnedAction,
  recordExperience,
  selectEliteByFitness,
  selectEliteEnsemble,
  calculateAdaptiveMutationRate,
  sampleExperiences,
  calculateFitnessFromSamples
} from './services/evolutionaryLearningService';
import {
  saveModel,
  loadModel,
  exportModel,
  importModel,
  createTrainValSplit,
  calculateEpochMetrics,
  shouldStopEarly,
  calculateLearningRate,
  maintainDiversity,
  suggestHyperparameters,
} from './services/professionalTrainingService';
import ControlPanel from './components/ControlPanel';
import HilbertSpaceView from './components/HilbertSpaceView';
import InfoPanel from './components/InfoPanel';
import MarketView from './components/EnvironmentView';
import GuildDynamicsView from './components/GuildDynamicsView';
import TradingPanel from './components/TradingPanel';
import { TrainingMetrics } from './components/TrainingMetrics';

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
    directionAccuracy: 0,
    totalPredictions: 0,
    correctPredictions: 0,
    predictionHistory: [],
  });
  const [phaseHistory, setPhaseHistory] = useState<Array<Record<string, number>>>([]);
  
  // State for handling async data fetching
  const [marketData, setMarketData] = useState<Candle[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Trading bot state
  const [tradingStats, setTradingStats] = useState<TradingStats>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalPnL: 0,
    currentPosition: null,
    positionHistory: [],
  });
  const [currentSignal, setCurrentSignal] = useState<TradingSignal | null>(null);
  
  // Multi-epoch training state
  const [trainingState, setTrainingState] = useState<TrainingState>({
    currentEpoch: 0,
    totalEpochs: 0,
    epochsCompleted: 0,
    timeframeIndex: 0,
    isTraining: false,
    epochMetrics: [],
    bestValidationEpoch: -1,
    epochsWithoutImprovement: 0,
    currentLearningRate: params.learningRate,
  });
  
  // Preserve observers between epochs for continuous learning
  const preservedObserversRef = useRef<Observer[] | null>(null);
  
  // Train/validation split indices
  const trainValSplitRef = useRef<{ trainIndices: number[]; valIndices: number[] } | null>(null);
  const [isValidationPhase, setIsValidationPhase] = useState(false);
  
  // RL: Track last trade outcome for credit assignment
  const lastTradeRef = useRef<{ action: 'BUY' | 'SELL' | 'HOLD'; position: Position | null }>({
    action: 'HOLD',
    position: null,
  });

  const simulationIntervalRef = useRef<number | null>(null);

  // Fetch data when component mounts or timeframe changes
  useEffect(() => {
    const loadMarketData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchMarketData(params.timeframe);
        setMarketData(data);
      } catch (err) {
        setError("Failed to load market data. The API may be down or your connection is offline.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadMarketData();
  }, [params.timeframe]);

  const initializeSimulation = useCallback(() => {
    if (!marketData) return;

    setCurrentTimeStep(60);
    const initialPrice = marketData[59].close;

    const initialCollectivePhase = PRIMES.reduce((acc, p) => {
      acc[p] = 0;
      return acc;
    }, {} as { [prime: number]: number });
    
    const searchRange = initialPrice * 0.1;

    // Use preserved observers if continuing training, otherwise create new ones
    const observers: Observer[] = preservedObserversRef.current || Array.from({ length: params.numObservers }, (_, i) => {
      const n = initialPrice + getRandomInt(-searchRange, searchRange);
      const { reward, error } = calculateReward(n, marketData[60].close);
      const embedding = calculateEmbedding(n, initialCollectivePhase);
      
      // Determine proposed action based on predicted vs current price
      const proposedAction: 'BUY' | 'SELL' | 'HOLD' =
        n > initialPrice * 1.01 ? 'BUY' :
        n < initialPrice * 0.99 ? 'SELL' : 'HOLD';
      
      return {
        id: i,
        n,
        reward,
        error,
        embedding,
        proposedAction,
        proposedSize: 0.5 + Math.random() * 0.5, // Random initial size 0.5-1.0
        tradingReward: 0,
        contributedToTrade: false,
        lifetimeTradingPnL: 0,
        // Evolutionary Strategy with Memory fields
        experienceBuffer: [],
        strategyGenes: {
          riskTolerance: 0.3 + Math.random() * 0.5, // 0.3-0.8 random start
          trendFollowing: Math.random(), // 0-1 random
          volatilityPreference: Math.random(), // 0-1 random
          holdingBias: (Math.random() - 0.5) * 0.4, // -0.2 to 0.2
        },
        fitness: 0,
      };
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
      directionAccuracy: 0,
      totalPredictions: 0,
      correctPredictions: 0,
      predictionHistory: [],
    });
    
    setPhaseHistory([]);
    
    // In training mode, preserve trading stats between epochs for cumulative learning
    if (!preservedObserversRef.current || !params.trainingMode) {
      // Reset trading stats only on first epoch or when not in training mode
      setTradingStats({
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        currentPosition: null,
        positionHistory: [],
      });
    }
    
    setCurrentSignal(null);
  }, [params, marketData]);

  // Initialize simulation when data is loaded or params are reset
  useEffect(() => {
    if(marketData) {
      initializeSimulation();
    }
  }, [params.resetToken, initializeSimulation, marketData]);
  
  // Auto-restart for next epoch in training mode
  useEffect(() => {
    if (params.trainingMode && trainingState.epochsCompleted < params.targetEpochs && marketData) {
      // Small delay to allow state to settle
      const timer = setTimeout(() => {
        if (trainingState.currentEpoch > 0 && !isRunning) {
          console.log(`Starting epoch ${trainingState.currentEpoch + 1}/${params.targetEpochs}${params.cycleTimeframes ? ` (${TRAINING_TIMEFRAMES[trainingState.timeframeIndex]})` : ''}`);
          initializeSimulation();
          setIsRunning(true);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [trainingState.epochsCompleted, params.trainingMode, params.targetEpochs, marketData, initializeSimulation, isRunning, params.cycleTimeframes, trainingState.timeframeIndex, trainingState.currentEpoch]);
  
  // Load saved model
  const handleLoadModel = useCallback(() => {
    const checkpoint = loadModel();
    if (checkpoint) {
      preservedObserversRef.current = checkpoint.observers;
      setTrainingState(prev => ({
        ...prev,
        epochMetrics: checkpoint.trainingMetrics,
        epochsCompleted: checkpoint.totalEpochs,
      }));
      alert(`Model loaded: ${checkpoint.observers.length} observers, ${checkpoint.totalEpochs} epochs completed`);
      // Reinitialize with loaded observers
      setParams(prev => ({ ...prev, resetToken: prev.resetToken + 1 }));
    } else {
      alert('No saved model found');
    }
  }, []);
  
  // Save model handler
  const handleSaveModel = useCallback(() => {
    if (guild) {
      saveModel(guild.observers, trainingState.epochMetrics, params, trainingState.epochsCompleted);
      alert(`Model saved: ${guild.observers.length} observers, ${trainingState.epochsCompleted} epochs`);
    }
  }, [guild, trainingState.epochMetrics, trainingState.epochsCompleted, params]);
  
  // Export model handler
  const handleExportModel = useCallback(() => {
    if (guild) {
      const checkpoint: ModelCheckpoint = {
        version: '1.0',
        timestamp: Date.now(),
        observers: guild.observers,
        trainingMetrics: trainingState.epochMetrics,
        params,
        totalEpochs: trainingState.epochsCompleted,
      };
      exportModel(checkpoint);
    }
  }, [guild, trainingState.epochMetrics, trainingState.epochsCompleted, params]);
  
  // Import model handler
  const handleImportModel = useCallback(async (file: File) => {
    try {
      const checkpoint = await importModel(file);
      preservedObserversRef.current = checkpoint.observers;
      setTrainingState(prev => ({
        ...prev,
        epochMetrics: checkpoint.trainingMetrics,
        epochsCompleted: checkpoint.totalEpochs,
      }));
      alert(`Model imported: ${checkpoint.observers.length} observers, ${checkpoint.totalEpochs} epochs`);
      setParams(prev => ({ ...prev, resetToken: prev.resetToken + 1 }));
    } catch (error) {
      alert('Failed to import model: Invalid file format');
      console.error(error);
    }
  }, []);
  
  // Start training mode
  const startTraining = useCallback(() => {
    if (params.trainingMode) {
      preservedObserversRef.current = null; // Reset for fresh training
      setTrainingState({
        currentEpoch: 0,
        totalEpochs: params.targetEpochs,
        epochsCompleted: 0,
        timeframeIndex: 0,
        isTraining: true,
        epochMetrics: [],
        bestValidationEpoch: -1,
        epochsWithoutImprovement: 0,
        currentLearningRate: params.learningRate,
      });
      setIsRunning(true);
    }
  }, [params.trainingMode, params.targetEpochs, params.learningRate]);

  // Helper function for standard deviation
  const calculateStdDev = (values: number[]): number => {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  };

  const runSimulationStep = useCallback(() => {
    if (!marketData) return;

    setCurrentTimeStep(prevStep => {
      const nextStep = prevStep + 1;
      if (nextStep >= marketData.length - 1) {
        // End of epoch reached - Professional Training Integration
        
        if (params.trainingMode && trainingState.epochsCompleted < params.targetEpochs) {
          // Calculate epoch metrics
          setGuild(currentGuild => {
            if (!currentGuild) return null;
            
            setTradingStats(currentStats => {
              // Calculate metrics for this epoch
              const epochMetrics = calculateEpochMetrics(
                trainingState.currentEpoch,
                params.timeframe,
                currentGuild.observers,
                currentStats.totalTrades,
                currentStats.winningTrades,
                currentStats.losingTrades,
                currentStats.totalPnL,
                currentStats.sharpeRatio,
                currentStats.maxDrawdown || 0
              );
              
              // Update training state with metrics
              setTrainingState(prev => {
                const newMetrics = [...prev.epochMetrics, epochMetrics];
                
                // Check for early stopping
                if (shouldStopEarly(newMetrics, 3)) {
                  console.log('🛑 Early stopping activated');
                  setIsRunning(false);
                  return { ...prev, isTraining: false, epochMetrics: newMetrics };
                }
                
                // Apply diversity maintenance
                const diversityMaintainedObservers = maintainDiversity(currentGuild.observers, 0.3);
                preservedObserversRef.current = diversityMaintainedObservers;
                
                // Calculate next learning rate
                const nextLR = calculateLearningRate(
                  prev.currentEpoch + 1,
                  params.targetEpochs,
                  params.learningRate
                );
                
                // Save model checkpoint
                saveModel(diversityMaintainedObservers, newMetrics, params, params.targetEpochs);
                
                // Move to next epoch
                const nextEpochsCompleted = prev.epochsCompleted + 1;
                const nextTimeframeIndex = params.cycleTimeframes
                  ? (prev.timeframeIndex + 1) % TRAINING_TIMEFRAMES.length
                  : prev.timeframeIndex;
                
                console.log(`✅ Epoch ${prev.currentEpoch + 1} complete: Win Rate ${epochMetrics.winRate.toFixed(1)}%, P&L $${epochMetrics.totalPnL.toFixed(2)}, Diversity ${epochMetrics.diversityScore.toFixed(2)}`);
                
                if (nextEpochsCompleted < params.targetEpochs) {
                  return {
                    ...prev,
                    currentEpoch: nextEpochsCompleted,
                    epochsCompleted: nextEpochsCompleted,
                    timeframeIndex: nextTimeframeIndex,
                    epochMetrics: newMetrics,
                    currentLearningRate: nextLR,
                  };
                } else {
                  // Training complete
                  console.log(`🎉 Training complete! ${params.targetEpochs} epochs finished`);
                  setIsRunning(false);
                  return { ...prev, isTraining: false, epochMetrics: newMetrics };
                }
              });
              
              return currentStats;
            });
            
            // Update timeframe if cycling
            if (params.cycleTimeframes && trainingState.epochsCompleted + 1 < params.targetEpochs) {
              const nextTimeframeIndex = (trainingState.timeframeIndex + 1) % TRAINING_TIMEFRAMES.length;
              setParams(prev => ({
                ...prev,
                timeframe: TRAINING_TIMEFRAMES[nextTimeframeIndex],
                learningRate: trainingState.currentLearningRate,
              }));
            }
            
            return currentGuild;
          });
          
          return prevStep;
        } else if (!params.trainingMode) {
          // Not in training mode
          setIsRunning(false);
          return prevStep;
        } else {
          // Training complete
          setIsRunning(false);
          setTrainingState(prev => ({ ...prev, isTraining: false }));
          return prevStep;
        }
      }
      
      const actualNextClose = marketData[nextStep].close;
      const currentPrice = marketData[nextStep - 1].close;
      const recentPrices = marketData.slice(Math.max(0, nextStep - 20), nextStep).map(c => c.close);
      
      // Calculate market state once for all observers
      const volatility = recentPrices.length > 1
        ? calculateStdDev(recentPrices) / currentPrice
        : 0.02;
      const trend = recentPrices.length > 1
        ? (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0]
        : 0;

      setGuild(prevGuild => {
        if (!prevGuild) return null;

        // First evaluate prediction accuracy
        const evaluatedObservers = prevGuild.observers.map(obs => {
          const { reward, error } = calculateReward(obs.n, actualNextClose);
          
          // Generate learned action based on strategy genes
          const ecologyFeatures = extractEcologyFeatures(
            obs.n,
            currentPrice,
            reward,
            prevGuild.collectivePhaseVector,
            recentPrices
          );
          
          const { action: proposedAction, size: proposedSize } = generateLearnedAction(
            obs,
            currentPrice,
            {
              volatility,
              trend,
              regime: ecologyFeatures.marketRegime,
            }
          );
          
          return { ...obs, reward, error, proposedAction, proposedSize };
        });

        // RL: Select elite ensemble (top 3 observers) for more robust learning
        const eliteEnsemble = selectEliteEnsemble(evaluatedObservers, 3);
        const eliteObserver = eliteEnsemble[0]; // Primary elite
        
        const newEliteN = eliteObserver.n;
        const newEliteReward = eliteObserver.reward;
        
        // Calculate average elite fitness for evolution target
        const avgEliteFitness = eliteEnsemble.reduce((sum, obs) =>
          sum + calculateFitness(obs), 0
        ) / eliteEnsemble.length;

        // RL: Update phase vector based on both prediction AND trading success
        const newCollectivePhaseVector = { ...prevGuild.collectivePhaseVector };
        for (const p of PRIMES) {
          const oldPhase = prevGuild.collectivePhaseVector[p];
          const eliteMod = Math.round(newEliteN) % p;
          
          // Weight phase update by trading performance
          // If elite has good trading history, trust their phase more
          const tradingWeight = Math.max(0.5, Math.min(1.5,
            1.0 + (eliteObserver.lifetimeTradingPnL / 1000) // +/- 50% based on P&L
          ));
          
          const effectiveLearningRate = params.learningRate * tradingWeight;
          newCollectivePhaseVector[p] = (1 - effectiveLearningRate) * oldPhase + effectiveLearningRate * eliteMod;
        }

        const nextPriceContext = actualNextClose;
        const searchRange = nextPriceContext * 0.1;

        // Evolve observers toward elite ensemble's successful strategies
        const evolvedObservers = evaluatedObservers.map(obs => {
          let evolved = obs;
          
          // Calculate adaptive mutation rate based on recent performance
          const adaptiveMutationRate = calculateAdaptiveMutationRate(obs, params.mutationRate);
          
          // Evolve strategy genes toward elite's genes (if not already elite)
          if (!eliteEnsemble.some(elite => elite.id === obs.id)) {
            // Choose a random elite from ensemble to evolve toward
            const targetElite = eliteEnsemble[Math.floor(Math.random() * eliteEnsemble.length)];
            evolved = evolveObserver(obs, targetElite, avgEliteFitness, params.learningRate);
            
            // Move prediction toward elite (keep this for convergence)
            const moveProbability = 1.0 - obs.reward;
            if (Math.random() < moveProbability) {
              const direction = Math.sign(newEliteN - obs.n);
              const step = Math.random() * Math.abs(newEliteN - obs.n) * 0.5;
              evolved = { ...evolved, n: evolved.n + direction * step };
            }
            
            // Experience replay: learn from sampled past experiences
            if (obs.experienceBuffer.length > 20 && Math.random() < 0.3) {
              const sampledExperiences = sampleExperiences(obs, 10);
              const sampleFitness = calculateFitnessFromSamples(sampledExperiences);
              
              // If sampled fitness is poor, increase exploration
              if (sampleFitness < 0.4) {
                evolved = mutateStrategyGenes(evolved, adaptiveMutationRate * 1.5, 0.15);
              }
            }
          }
          
          // Mutate prediction (exploration) with adaptive rate
          if (Math.random() < adaptiveMutationRate) {
            const mutationAmount = getRandomInt(-searchRange / 2, searchRange / 2);
            evolved = { ...evolved, n: nextPriceContext + mutationAmount };
          }
          
          // Mutate strategy genes (exploration) with adaptive rate
          evolved = mutateStrategyGenes(evolved, adaptiveMutationRate, 0.1);
          
          // Recalculate embedding and action for new state
          const newEmbedding = calculateEmbedding(evolved.n, newCollectivePhaseVector);
          
          const { action: newProposedAction, size: newProposedSize } = generateLearnedAction(
            evolved,
            nextPriceContext,
            {
              volatility,
              trend,
              regime: extractEcologyFeatures(
                evolved.n,
                nextPriceContext,
                evolved.reward,
                newCollectivePhaseVector,
                recentPrices
              ).marketRegime,
            }
          );
          
          return {
            ...evolved,
            embedding: newEmbedding,
            proposedAction: newProposedAction,
            proposedSize: newProposedSize,
          };
        });

        setStats(prevStats => {
            const currentPrice = marketData[nextStep - 1].close;
            const predicted: 'UP' | 'DOWN' = newEliteN > currentPrice ? 'UP' : 'DOWN';
            const actual: 'UP' | 'DOWN' = actualNextClose > currentPrice ? 'UP' : 'DOWN';
            const correct = predicted === actual;
            const priceChange = ((actualNextClose - currentPrice) / currentPrice) * 100;
            
            const newPredictionResult = {
                predicted,
                actual,
                correct,
                priceChange,
            };
            
            const newCorrectPredictions = prevStats.correctPredictions + (correct ? 1 : 0);
            const newTotalPredictions = prevStats.totalPredictions + 1;
            const newAccuracy = (newCorrectPredictions / newTotalPredictions) * 100;
            
            return {
                timeStep: nextStep - 60,
                currentPrice: actualNextClose,
                bestPrediction: newEliteN,
                predictionError: eliteObserver.error,
                directionAccuracy: newAccuracy,
                totalPredictions: newTotalPredictions,
                correctPredictions: newCorrectPredictions,
                lastPrediction: predicted,
                lastActual: actual,
                predictionHistory: [...prevStats.predictionHistory, newPredictionResult].slice(-100),
            };
        });
        
        // Extract ecology features for enhanced trading
        const ecologyFeatures = extractEcologyFeatures(
          newEliteN,
          currentPrice,
          newEliteReward,
          newCollectivePhaseVector,
          recentPrices
        );
        
        const predictedDirection: 'UP' | 'DOWN' = newEliteN > currentPrice ? 'UP' : 'DOWN';
        
        // Generate trading signal with ecology features
        setCurrentSignal(prevSignal => {
          return generateTradingSignal(
            newEliteN,
            actualNextClose,
            prevGuild.eliteReward * 100,
            predictedDirection,
            marketData[nextStep].time,
            ecologyFeatures
          );
        });
        
        // Execute trading signal and update positions
        let tradingOutcome: number | null = null;
        let executedAction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        
        setTradingStats(prevTradingStats => {
          const signal = generateTradingSignal(
            newEliteN,
            actualNextClose,
            prevGuild.eliteReward * 100,
            predictedDirection,
            marketData[nextStep].time,
            ecologyFeatures
          );
          
          executedAction = signal.action;
          
          const { newPosition, closedPosition } = executeTradingSignal(
            signal,
            prevTradingStats.currentPosition,
            actualNextClose,
            marketData[nextStep].time
          );
          
          // Calculate outcome for experience recording
          if (closedPosition && closedPosition.pnl !== undefined) {
            tradingOutcome = closedPosition.pnl;
          }
          
          // RL: Store last trade outcome for credit assignment
          if (closedPosition) {
            lastTradeRef.current = {
              action: signal.action,
              position: closedPosition,
            };
          }
          
          const updatedHistory = closedPosition
            ? [...prevTradingStats.positionHistory, closedPosition]
            : prevTradingStats.positionHistory;
          
          return calculateTradingStats(newPosition, updatedHistory);
        });
        
        // Record trading experience for all observers
        const observersWithExperience = evolvedObservers.map(obs => {
          const experience = {
            timestamp: marketData[nextStep].time,
            marketState: {
              price: actualNextClose,
              volatility,
              trend,
              regime: ecologyFeatures.marketRegime,
            },
            action: obs.proposedAction,
            proposedSize: obs.proposedSize,
            outcome: tradingOutcome || 0,
            wasExecuted: obs.proposedAction === executedAction && tradingOutcome !== null,
          };
          
          return recordExperience(obs, experience);
        });
        
        
        setPhaseHistory(prevHistory => [
            ...prevHistory.slice(-99),
            { generation: nextStep - 60, ...newCollectivePhaseVector }
        ]);
        
        // RL: Final observer state depends on whether we have trading feedback
        const finalObservers = lastTradeRef.current.position
          ? assignTradingCredit(observersWithExperience, lastTradeRef.current.action, lastTradeRef.current.position)
          : observersWithExperience;
        
        // Clear trade ref after processing
        if (lastTradeRef.current.position) {
          lastTradeRef.current = { action: 'HOLD', position: null };
        }
        
        return {
          ...prevGuild,
          observers: finalObservers,
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
                <ControlPanel
                  params={params}
                  setParams={setParams}
                  isRunning={isRunning}
                  setIsRunning={setIsRunning}
                  trainingState={trainingState}
                  onStartTraining={startTraining}
                  onLoadModel={handleLoadModel}
                  onSaveModel={handleSaveModel}
                  onExportModel={handleExportModel}
                  onImportModel={handleImportModel}
                />
                <InfoPanel stats={stats} />
                <TradingPanel tradingStats={tradingStats} currentSignal={currentSignal} />
                {params.trainingMode && trainingState.epochMetrics.length > 0 && (
                  <TrainingMetrics
                    metrics={trainingState.epochMetrics}
                    currentEpoch={trainingState.currentEpoch}
                    targetEpochs={trainingState.totalEpochs}
                    currentLearningRate={trainingState.currentLearningRate}
                    suggestion={suggestHyperparameters(trainingState.epochMetrics).suggestion}
                  />
                )}
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
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        {/* Professional Exchange Header */}
        <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xl">Ω</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight">Observer Ecology</h1>
                                <p className="text-xs text-gray-400">AI Trading System</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center space-x-2 ml-6 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                            <span className="text-xs font-semibold text-gray-400">BTC/USDT</span>
                            <span className="text-sm font-mono font-bold text-green-400">
                                ${stats.currentPrice > 0 ? stats.currentPrice.toFixed(2) : '---'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="hidden lg:flex items-center space-x-4 text-xs">
                            <div className="flex flex-col items-end">
                                <span className="text-gray-400">24h Volume</span>
                                <span className="text-white font-semibold">$2.4B</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-gray-400">Win Rate</span>
                                <span className={`font-semibold ${tradingStats.winRate >= 60 ? 'text-green-400' : tradingStats.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {tradingStats.winRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-gray-400">Total P&L</span>
                                <span className={`font-semibold ${tradingStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${tradingStats.totalPnL.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
        
        {/* Main Content */}
        <div className="max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8">
            {renderContent()}
        </div>
    </div>
  );
};

export default App;