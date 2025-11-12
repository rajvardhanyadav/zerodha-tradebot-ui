
export enum Instrument {
  NIFTY = 'NIFTY',
  BANKNIFTY = 'BANKNIFTY',
  FINNIFTY = 'FINNIFTY',
}

export enum BotStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  INACTIVE = 'INACTIVE',
  MAX_LOSS_REACHED = 'MAX_LOSS_REACHED',
}

export enum StrategyType {
  ATM_STRADDLE = 'ATM_STRADDLE',
  ATM_STRANGLE = 'ATM_STRANGLE',
  // FIX: Add OTM_STRANGLE to support the logic in Dashboard.tsx
  OTM_STRANGLE = 'OTM_STRANGLE',
}

export interface ApiStrategyType {
  name: string;
  description: string;
  implemented: boolean;
}

export interface ApiInstrument {
  code: string;
  name: string;
  lotSize: number;
  strikeInterval: number;
}

// New type for active strategies from the /api/strategies/active endpoint
export interface StrategyPosition {
  executionId: string;
  strategyType: string;
  instrumentType: string;
  expiry: string;
  status: string;
  message: string;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  timestamp: number;
}


export interface TradeLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface UserProfile {
  userName: string;
}

export interface MonitoringStatus {
  connected: boolean;
  activeMonitors: number;
}

export interface Order {
  orderId: string;
  status: string;
  tradingSymbol: string;
  exchange: string;
  transactionType: "BUY" | "SELL";
  orderType: string;
  product: string;
  quantity: number;
  averagePrice: number;
  filledQuantity: number;
  orderTimestamp: string;
}

export interface Position {
  tradingSymbol: string;
  exchange: string;
  product: string;
  netQuantity: number;
  averagePrice: number;
  lastPrice: number;
  pnl: number;
  buyValue: number;
  sellValue: number;
}

export interface DayPNL {
  totalRealised: number;
  totalUnrealised: number;
  totalM2M: number;
  totalDayPnL: number;
  positionCount: number;
  tradingMode: string;
}

export interface ChargeDetails {
  transactionTax: number;
  transactionTaxType: string;
  exchangeTurnoverCharge: number;
  sebiTurnoverCharge: number;
  brokerage: number;
  stampDuty: number;
  gst: {
    igst: number;
    cgst: number;
    sgst: number;
    total: number;
  };
  total: number;
}

export interface OrderCharge {
  orderId: string;
  charges: ChargeDetails;
}

export interface ChargesBreakdown {
  brokerage: number;
  stt: number;
  exchange: number;
  sebi: number;
  stampDuty: number;
  gst: number;
  total: number;
}