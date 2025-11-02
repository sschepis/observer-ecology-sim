import React from 'react';
import { EpochMetrics } from '../types';

interface TrainingMetricsProps {
  metrics: EpochMetrics[];
  currentEpoch: number;
  targetEpochs: number;
  currentLearningRate: number;
  suggestion?: string;
}

export const TrainingMetrics: React.FC<TrainingMetricsProps> = ({
  metrics,
  currentEpoch,
  targetEpochs,
  currentLearningRate,
  suggestion
}) => {
  const latestMetrics = metrics[metrics.length - 1];
  
  const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;
  const formatMoney = (val: number) => val >= 0 ? `$${val.toFixed(2)}` : `-$${Math.abs(val).toFixed(2)}`;
  const formatNumber = (val: number) => val.toFixed(3);

  return (
    <div style={{
      backgroundColor: '#1a1a2e',
      border: '2px solid #00ff88',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '20px'
    }}>
      <h3 style={{ 
        color: '#00ff88', 
        marginTop: 0,
        marginBottom: '16px',
        fontSize: '18px',
        borderBottom: '1px solid #00ff88',
        paddingBottom: '8px'
      }}>
        🎓 Training Metrics
      </h3>

      {/* Progress Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6px',
          fontSize: '13px',
          color: '#a0a0a0'
        }}>
          <span>Epoch Progress</span>
          <span>{currentEpoch} / {targetEpochs}</span>
        </div>
        <div style={{
          height: '8px',
          backgroundColor: '#0f0f1e',
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid #333'
        }}>
          <div style={{
            height: '100%',
            width: `${(currentEpoch / targetEpochs) * 100}%`,
            backgroundColor: '#00ff88',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Current Metrics Grid */}
      {latestMetrics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <MetricCard
            label="Win Rate (Train)"
            value={formatPercent(latestMetrics.winRate)}
            color={latestMetrics.winRate > 0.5 ? '#00ff88' : '#ff6b6b'}
            icon="📈"
          />
          <MetricCard
            label="Win Rate (Val)"
            value={formatPercent(latestMetrics.validationWinRate || 0)}
            color={(latestMetrics.validationWinRate || 0) > 0.5 ? '#00ff88' : '#ff6b6b'}
            icon="📊"
          />
          <MetricCard
            label="P&L (Train)"
            value={formatMoney(latestMetrics.totalPnL)}
            color={latestMetrics.totalPnL > 0 ? '#00ff88' : '#ff6b6b'}
            icon="💰"
          />
          <MetricCard
            label="P&L (Val)"
            value={formatMoney(latestMetrics.validationPnL || 0)}
            color={(latestMetrics.validationPnL || 0) > 0 ? '#00ff88' : '#ff6b6b'}
            icon="💵"
          />
          <MetricCard
            label="Sharpe Ratio"
            value={formatNumber(latestMetrics.sharpeRatio)}
            color={latestMetrics.sharpeRatio > 1 ? '#00ff88' : latestMetrics.sharpeRatio > 0 ? '#ffaa00' : '#ff6b6b'}
            icon="📉"
          />
          <MetricCard
            label="Max Drawdown"
            value={formatPercent(latestMetrics.maxDrawdown)}
            color={latestMetrics.maxDrawdown < 0.2 ? '#00ff88' : latestMetrics.maxDrawdown < 0.4 ? '#ffaa00' : '#ff6b6b'}
            icon="⚠️"
          />
          <MetricCard
            label="Avg Fitness"
            value={formatNumber(latestMetrics.avgFitness)}
            color="#00aaff"
            icon="🎯"
          />
          <MetricCard
            label="Diversity"
            value={formatNumber(latestMetrics.diversityScore)}
            color={latestMetrics.diversityScore > 0.3 ? '#00ff88' : '#ffaa00'}
            icon="🌈"
          />
        </div>
      )}

      {/* Learning Rate Display */}
      <div style={{
        backgroundColor: '#0f0f1e',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#a0a0a0', fontSize: '13px' }}>
            ⚡ Current Learning Rate
          </span>
          <span style={{ color: '#00aaff', fontSize: '16px', fontWeight: 'bold' }}>
            {currentLearningRate.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Hyperparameter Suggestion */}
      {suggestion && (
        <div style={{
          backgroundColor: '#1a1a3e',
          border: '1px solid #6666ff',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ color: '#a0a0a0', fontSize: '12px', marginBottom: '4px' }}>
            💡 Suggestion
          </div>
          <div style={{ color: '#aaaaff', fontSize: '13px', lineHeight: '1.4' }}>
            {suggestion}
          </div>
        </div>
      )}

      {/* Epoch History */}
      {metrics.length > 0 && (
        <div style={{
          marginTop: '16px',
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: '#0f0f1e',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '8px'
        }}>
          <div style={{
            color: '#a0a0a0',
            fontSize: '12px',
            marginBottom: '8px',
            paddingLeft: '4px'
          }}>
            📋 Epoch History
          </div>
          {metrics.map((m, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: idx === metrics.length - 1 ? '#1a1a3e' : '#0a0a1e',
                border: idx === metrics.length - 1 ? '1px solid #00ff88' : '1px solid #222',
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '4px',
                fontSize: '11px',
                color: '#ccc'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#00ff88' }}>Epoch {m.epoch}</span>
                <span style={{ color: '#aaa' }}>Timeframe: {m.timeframe}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Win: {formatPercent(m.winRate)}</span>
                <span>P&L: {formatMoney(m.totalPnL)}</span>
                <span>Div: {formatNumber(m.diversityScore)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  color: string;
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, color, icon }) => (
  <div style={{
    backgroundColor: '#0f0f1e',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '12px',
    transition: 'transform 0.2s, box-shadow 0.2s'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '4px'
    }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span style={{ color: '#a0a0a0', fontSize: '11px' }}>{label}</span>
    </div>
    <div style={{
      color: color,
      fontSize: '18px',
      fontWeight: 'bold',
      textAlign: 'right'
    }}>
      {value}
    </div>
  </div>
);