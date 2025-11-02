
import React from 'react';
import type { FC } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { PrimeEmbedding } from '../types';

interface HilbertSpaceViewProps {
  embedding: PrimeEmbedding[] | null;
  eliteN: number | null;
}

const HilbertSpaceView: FC<HilbertSpaceViewProps> = ({ embedding, eliteN }) => {

  const phaseToColor = (phase: number) => {
    const hue = (phase * 180 / Math.PI) % 360;
    return `hsl(${hue}, 90%, 60%)`;
  };

  const chartData = embedding?.map(e => ({
    prime: e.prime,
    amplitude: e.amplitude,
    fullMark: 1, // For the grid lines
    color: phaseToColor(e.phase),
  })) || [];

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col h-full shadow-lg backdrop-blur-sm border border-gray-700">
      <h2 className="text-lg font-bold mb-2 text-cyan-300">Prime-Hilbert Embedding</h2>
      <p className="text-sm text-gray-400 mb-4">
        {eliteN !== null ? `Visualization for the current elite observer (n = ${eliteN})` : 'Waiting for simulation to start...'}
      </p>
      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid stroke="#4A5568" />
            <PolarAngleAxis dataKey="prime" tick={{ fill: '#A0AEC0', fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: 'none', stroke: 'none' }} />
            <Radar name="Amplitude" dataKey="amplitude" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            <Tooltip
              contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568', borderRadius: '0.5rem' }}
              labelStyle={{ color: '#E2E8F0' }}
              formatter={(value, name, props) => [
                Number(value).toFixed(3),
                'Amplitude'
              ]}
              labelFormatter={(label) => `Prime: ${label}`}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HilbertSpaceView;
