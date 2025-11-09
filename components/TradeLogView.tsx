
import React from 'react';
import { TradeLog } from '../types';

interface TradeLogViewProps {
  logs: TradeLog[];
}

const getLogColor = (type: TradeLog['type']) => {
  switch (type) {
    case 'success':
      return 'text-profit';
    case 'error':
      return 'text-loss';
    case 'warning':
      return 'text-yellow-500';
    case 'info':
    default:
      return 'text-blue-400';
  }
};

const TradeLogView: React.FC<TradeLogViewProps> = ({ logs }) => {
  return (
    <div className="h-96 overflow-y-auto space-y-2 pr-2">
      {logs.length === 0 && <p className="text-dark-text-secondary">No logs yet.</p>}
      {logs.map((log, index) => (
        <div key={index} className="flex text-xs font-mono">
          <span className="text-dark-text-secondary mr-2">{log.timestamp}</span>
          <p className={`${getLogColor(log.type)}`}>{log.message}</p>
        </div>
      ))}
    </div>
  );
};

export default TradeLogView;
