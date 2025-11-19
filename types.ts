


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

export const StrategyType = {
  ATM_STRADDLE: 'ATM_STRADDLE',
  ATM_STRANGLE: 'ATM_STRANGLE',
} as const;

export type StrategyType = string;

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
  userId: string;
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

export interface HistoricalPnlPoint {
  timestamp: string; // e.g., "09:15:00"
  pnl: number;
}

export interface HistoricalRunResult {
  executionId: string;
  finalPnL: number;
  pnlData: HistoricalPnlPoint[];
  message: string;
}

export interface TradingModeStatus {
  paperTradingEnabled: boolean;
  mode: 'PAPER_TRADING' | 'LIVE_TRADING';
  description: string;
  message?: string;
}

export interface OrderCharge {
    transactionType: "BUY" | "SELL";
    tradingsymbol: string;
    exchange: string;
    variety: string;
    product: string;
    orderType: string;
    quantity: number;
    price: number;
    charges: {
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
    };
}

export interface BotStatusResponse {
    status: 'RUNNING' | 'STOPPED';
    lastUpdated: string;
}