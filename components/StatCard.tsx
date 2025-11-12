
import React from 'react';
import { BotStatus, ChargesBreakdown } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  isCurrency?: boolean;
  isPL?: boolean;
  status?: BotStatus;
  breakdown?: ChargesBreakdown;
  icon: 'status' | 'monitoring' | 'ltp' | 'gross-pl' | 'charges' | 'net-pl';
}

const StatCardIcon: React.FC<{ icon: StatCardProps['icon'] }> = ({ icon }) => {
    const icons: Record<StatCardProps['icon'], React.ReactNode> = {
        status: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
            </svg>
        ),
        monitoring: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm0-7c-1.38 0-2.5 1.12-2.5 2.5s1.06 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z"/>
            </svg>
        ),
        ltp: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 17.08l1.5 1.41z"/>
            </svg>
        ),
        'gross-pl': (
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-.96.73-1.66 2.2-1.66 1.24 0 2 .6 2.2 1.66h2.08c-.14-1.72-1.5-3-3.8-3-2.09 0-3.8 1.39-3.8 3.32 0 2.23 1.94 3.03 3.8 3.52 2.29.59 3 1.23 3 2.18 0 1.05-.75 1.85-2.5 1.85-1.53 0-2.4-.7-2.6-1.85H8.1c.21 2.01 1.86 3.35 4.3 3.35 2.34 0 4.1-1.39 4.1-3.48 0-2.09-1.82-2.9-4.1-3.52z"/>
            </svg>
        ),
        charges: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
        ),
        'net-pl': (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
        ),
    };
    return <div className="p-3 bg-slate-700 rounded-full text-slate-400">{icons[icon]}</div>;
};

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, isCurrency, isPL, status, breakdown, icon }) => {
  let valueColor = 'text-slate-200';
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

  const renderBreakdownTooltip = () => {
    if (!breakdown || breakdown.total === 0) return null;
    return (
      <div className="absolute z-10 bottom-full mb-2 w-52 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none text-slate-200">
        <h4 className="font-bold text-sm mb-2 border-b border-slate-700 pb-1">Charges Breakdown</h4>
        <div className="space-y-1">
          <div className="flex justify-between"><span>Brokerage:</span> <span className="font-mono">₹{breakdown.brokerage.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>STT:</span> <span className="font-mono">₹{breakdown.stt.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Exchange Fees:</span> <span className="font-mono">₹{breakdown.exchange.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>SEBI Fees:</span> <span className="font-mono">₹{breakdown.sebi.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Stamp Duty:</span> <span className="font-mono">₹{breakdown.stampDuty.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>GST:</span> <span className="font-mono">₹{breakdown.gst.toFixed(2)}</span></div>
        </div>
      </div>
    );
  };


  return (
    <div className="relative group bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center space-x-4">
      <StatCardIcon icon={icon} />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <p className={`text-xl font-bold ${valueColor}`}>{formattedValue}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {renderBreakdownTooltip()}
    </div>
  );
};

export default StatCard;
