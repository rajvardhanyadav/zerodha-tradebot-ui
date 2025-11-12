
import React, { useState, useMemo } from 'react';
import { Position } from '../types';

interface PositionsTableProps {
  positions: Position[];
  isLoading?: boolean;
}

const PositionsTable: React.FC<PositionsTableProps> = ({ positions, isLoading }) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof Position; direction: 'ascending' | 'descending' } | null>({ key: 'pnl', direction: 'descending' });

  const sortedPositions = useMemo(() => {
    let sortableItems = [...positions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [positions, sortConfig]);

  const requestSort = (key: keyof Position) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Position) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };
  
  if (isLoading) {
      return <div className="text-center py-10 text-slate-400">Loading positions...</div>;
  }

  if (positions.length === 0) {
    return <div className="text-center py-10 text-slate-400">No positions for the day.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <h3 className="text-md font-semibold mb-2 text-slate-200">Positions ({positions.length})</h3>
      <div className="max-h-[30rem] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 sticky top-0 bg-slate-800/80 backdrop-blur-sm">
            <tr>
              <th className="p-2 font-medium text-slate-400 cursor-pointer hover:text-slate-200" onClick={() => requestSort('tradingSymbol')}>Symbol{getSortIndicator('tradingSymbol')}</th>
              <th className="p-2 font-medium text-slate-400 cursor-pointer hover:text-slate-200" onClick={() => requestSort('product')}>Product{getSortIndicator('product')}</th>
              <th className="p-2 font-medium text-slate-400 text-right cursor-pointer hover:text-slate-200" onClick={() => requestSort('netQuantity')}>Qty{getSortIndicator('netQuantity')}</th>
              <th className="p-2 font-medium text-slate-400 text-right cursor-pointer hover:text-slate-200" onClick={() => requestSort('averagePrice')}>Avg. Price{getSortIndicator('averagePrice')}</th>
              <th className="p-2 font-medium text-slate-400 text-right cursor-pointer hover:text-slate-200" onClick={() => requestSort('lastPrice')}>LTP{getSortIndicator('lastPrice')}</th>
              <th className="p-2 font-medium text-slate-400 text-right cursor-pointer hover:text-slate-200" onClick={() => requestSort('pnl')}>P/L{getSortIndicator('pnl')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedPositions.map((pos, index) => {
              const totalPL = pos.pnl ?? 0;
              
              return (
                <tr key={`${pos.tradingSymbol}-${pos.product}-${index}`} className="border-b border-slate-700 last:border-b-0 text-slate-200">
                  <td className="p-2 font-mono">{pos.tradingSymbol}</td>
                  <td className="p-2 font-mono">{pos.product}</td>
                  <td className="p-2 font-mono text-right">{pos.netQuantity}</td>
                  <td className="p-2 font-mono text-right">{pos.averagePrice.toFixed(2)}</td>
                  <td className="p-2 font-mono text-right">{pos.lastPrice.toFixed(2)}</td>
                  <td className={`p-2 font-mono text-right font-semibold ${totalPL >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {totalPL.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PositionsTable;