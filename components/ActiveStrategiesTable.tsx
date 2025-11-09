
import React from 'react';
import { StrategyPosition } from '../types';

interface ActiveStrategiesTableProps {
  strategies: StrategyPosition[];
  onStopMonitoring: (executionId: string) => Promise<void>;
  stoppingMonitorId: string | null;
}

const ActiveStrategiesTable: React.FC<ActiveStrategiesTableProps> = ({ strategies, onStopMonitoring, stoppingMonitorId }) => {

  if (strategies.length === 0) {
    return <div className="text-center py-10 text-dark-text-secondary">No active strategies.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-dark-border">
          <tr>
            <th className="p-2 text-sm text-dark-text-secondary">Strategy</th>
            <th className="p-2 text-sm text-dark-text-secondary">Instrument</th>
            <th className="p-2 text-sm text-dark-text-secondary text-right">Entry Value</th>
            <th className="p-2 text-sm text-dark-text-secondary text-right">Current Value</th>
            <th className="p-2 text-sm text-dark-text-secondary text-right">P/L</th>
            <th className="p-2 text-sm text-dark-text-secondary">Status</th>
            <th className="p-2 text-sm text-dark-text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {strategies.map((s) => {
            const isStopping = stoppingMonitorId === s.executionId;
            return (
              <tr key={s.executionId} className="border-b border-dark-border last:border-b-0">
                <td className="p-2 font-mono">
                  {s.strategyType.replace(/_/g, ' ')}
                </td>
                <td className="p-2 font-mono">{s.instrumentType} ({s.expiry})</td>
                <td className="p-2 font-mono text-right">{(s.entryPrice ?? 0).toFixed(2)}</td>
                <td className="p-2 font-mono text-right">{(s.currentPrice ?? 0).toFixed(2)}</td>
                <td className={`p-2 font-mono text-right font-semibold ${(s.profitLoss ?? 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {(s.profitLoss ?? 0).toFixed(2)}
                </td>
                <td className="p-2 font-mono">{s.status}</td>
                <td className="p-2">
                   {s.status.toUpperCase() === 'ACTIVE' && (
                       <button
                         onClick={() => onStopMonitoring(s.executionId)}
                         disabled={isStopping}
                         className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                       >
                         {isStopping ? 'Stopping...' : 'Stop Monitor'}
                       </button>
                   )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ActiveStrategiesTable;
