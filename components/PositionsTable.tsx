
import React from 'react';
import { Position } from '../types';

interface PositionsTableProps {
  positions: Position[];
}

const PositionsTable: React.FC<PositionsTableProps> = ({ positions }) => {
  if (positions.length === 0) {
    return <div className="text-center py-10 text-dark-text-secondary">No open positions.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-dark-border">
          <tr>
            <th className="p-2 text-sm text-dark-text-secondary">Symbol</th>
            <th className="p-2 text-sm text-dark-text-secondary">Product</th>
            <th className="p-2 text-sm text-dark-text-secondary text-right">Qty</th>
            <th className="p-2 text-sm text-dark-text-secondary text-right">Avg. Price</th>
            <th className="p-2 text-sm text-dark-text-secondary text-right">LTP</th>
            <th className="p-2 text-sm text-dark-text-secondary text-right">P/L</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos, index) => (
            <tr key={`${pos.tradingSymbol}-${pos.product}-${index}`} className="border-b border-dark-border last:border-b-0">
              <td className="p-2 font-mono">{pos.tradingSymbol}</td>
              <td className="p-2 font-mono">{pos.product}</td>
              <td className="p-2 font-mono text-right">{pos.quantity}</td>
              <td className="p-2 font-mono text-right">{pos.averagePrice.toFixed(2)}</td>
              <td className="p-2 font-mono text-right">{pos.lastPrice.toFixed(2)}</td>
              <td className={`p-2 font-mono text-right font-semibold ${pos.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {pos.pnl.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PositionsTable;
