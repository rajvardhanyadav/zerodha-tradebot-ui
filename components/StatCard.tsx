
import React from 'react';
import { BotStatus } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  isCurrency?: boolean;
  isPL?: boolean;
  status?: BotStatus;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, isCurrency, isPL, status }) => {
  let valueColor = 'text-dark-text';
  if (isPL) {
    const numericValue = Number(value);
    if (numericValue > 0) valueColor = 'text-profit';
    if (numericValue < 0) valueColor = 'text-loss';
  } else if (status) {
    switch(status) {
        case BotStatus.RUNNING: valueColor = 'text-profit'; break;
        case BotStatus.STOPPED: valueColor = 'text-loss'; break;
        case BotStatus.INACTIVE: valueColor = 'text-yellow-500'; break;
        case BotStatus.MAX_LOSS_REACHED: valueColor = 'text-red-700 font-bold'; break;
    }
  }

  const formattedValue = isCurrency ? `₹${value}` : value;

  return (
    <div className="bg-dark-card p-4 rounded-lg border border-dark-border">
      <h3 className="text-sm font-medium text-dark-text-secondary mb-1">{title}</h3>
      <p className={`text-2xl font-bold ${valueColor}`}>{formattedValue}</p>
      {subtitle && <p className="text-xs text-dark-text-secondary mt-1">{subtitle}</p>}
    </div>
  );
};

export default StatCard;
