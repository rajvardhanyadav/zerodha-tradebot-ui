
import React from 'react';
import { StrategyPosition } from '../types';

interface ActiveStrategiesTableProps {
  strategies: StrategyPosition[];
  onStopMonitoring: (executionId: string) => void;
  stoppingMonitorId: string | null;
  confirmingStopMonitorId: string | null;
}

const ActiveStrategiesTable: React.FC<ActiveStrategiesTableProps> = ({ strategies, onStopMonitoring, stoppingMonitorId, confirmingStopMonitorId }) => {

  if (strategies.length === 0) {
    return <div className="text-center py-10 text-slate-400">No active strategies.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <h3 className="text-md font-semibold mb-2 text-slate-200">Active Strategies ({strategies.length})</h3>
      <table className="w-full text-left">
        <thead className="border-b border-slate-700 bg-slate-700/50">
          <tr>
            <th className="p-2 text-sm text-slate-400">Strategy</th>
            <th className="p-2 text-sm text-slate-400">Instrument</th>
            <th className="p-2 text-sm text-slate-400 text-right">Entry Value</th>
            <th className="p-2 text-sm text-slate-400 text-right">Current Value</th>
            <th className="p-2 text-sm text-slate-400 text-right">P/L</th>
            <th className="p-2 text-sm text-slate-400">Status</th>
            <th className="p-2 text-sm text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {strategies.map((s) => {
            const isStopping = stoppingMonitorId === s.executionId;
            const isConfirming = confirmingStopMonitorId === s.executionId;

            let displayEntry = s.entryPrice ?? 0;
            let displayCurrent = s.currentPrice ?? 0;
            let displayPL = s.profitLoss ?? 0;

            if (s.orderLegs && s.orderLegs.length > 0) {
                 if (s.entryPrice === null || s.entryPrice === undefined) {
                     displayEntry = s.orderLegs.reduce((sum, leg) => sum + (leg.entryPrice || 0), 0);
                 }
                 
                 // If completed/stopped, calculate exit values from legs if main fields are missing
                 if (['COMPLETED', 'STOPPED', 'MAX_LOSS_REACHED'].includes(s.status)) {
                     if (s.currentPrice === null || s.currentPrice === undefined) {
                        displayCurrent = s.orderLegs.reduce((sum, leg) => sum + (leg.exitPrice || 0), 0);
                     }
                     if (s.profitLoss === null || s.profitLoss === undefined) {
                        displayPL = s.orderLegs.reduce((sum, leg) => sum + (leg.realizedPnl || 0), 0);
                     }
                 }
            }

            return (
              <tr key={s.executionId} className="border-b border-slate-700 last:border-b-0 text-slate-200">
                <td className="p-2 font-mono">
                  {s.strategyType.replace(/_/g, ' ')}
                </td>
                <td className="p-2 font-mono">{s.instrumentType} ({s.expiry})</td>
                <td className="p-2 font-mono text-right">{displayEntry.toFixed(2)}</td>
                <td className="p-2 font-mono text-right">{displayCurrent.toFixed(2)}</td>
                <td className={`p-2 font-mono text-right font-semibold ${displayPL >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {displayPL.toFixed(2)}
                </td>
                <td className="p-2 font-mono">{s.status}</td>
                <td className="p-2">
                   {s.status.toUpperCase() === 'ACTIVE' && (
                       <button
                         onClick={() => onStopMonitoring(s.executionId)}
                         disabled={isStopping}
                         className={`text-xs ${
                            isConfirming 
                                ? 'bg-orange-600 hover:bg-orange-700' 
                                : 'bg-yellow-600 hover:bg-yellow-700'
                         } text-white px-2 py-1 rounded disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors`}
                       >
                         {isStopping ? 'Stopping...' : (isConfirming ? 'Confirm?' : 'Stop Monitor')}
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
