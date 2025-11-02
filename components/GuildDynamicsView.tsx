
import React from 'react';
import type { FC } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PRIMES } from '../constants';

interface GuildDynamicsViewProps {
  history: Array<Record<string, number>>;
}

// Show first 8 primes for clarity
const PRIMES_TO_SHOW = PRIMES.slice(0, 8);
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#e67e22', '#3498db', '#1abc9c', '#f1c40f', '#9b59b6'];


const GuildDynamicsView: FC<GuildDynamicsViewProps> = ({ history }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col h-full shadow-lg backdrop-blur-sm border border-gray-700">
      <h2 className="text-lg font-bold mb-2 text-cyan-300">Guild Dynamics</h2>
      <p className="text-sm text-gray-400 mb-4">
        Evolution of the Collective Phase Vector (φB) over generations.
      </p>
      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={history}
            margin={{
              top: 5,
              right: 20,
              left: -10,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
            <XAxis dataKey="generation" tick={{ fill: '#A0AEC0', fontSize: 10 }} />
            <YAxis tick={{ fill: '#A0AEC0', fontSize: 10 }} domain={['dataMin', 'dataMax']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568', borderRadius: '0.5rem' }}
              labelStyle={{ color: '#E2E8F0' }}
              labelFormatter={(label) => `Generation: ${label}`}
              formatter={(value: number) => [value.toFixed(2), 'Phase']}
            />
            <Legend wrapperStyle={{fontSize: "12px"}}/>
            {PRIMES_TO_SHOW.map((p, index) => (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                name={`Prime ${p}`}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GuildDynamicsView;
