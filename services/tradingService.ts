
import { Instrument, StrategyType, StrategyPosition } from '../types';
import * as api from './kiteConnect';

interface ExecuteStrategyParams {
  strategyType: StrategyType;
  instrumentType: Instrument;
  expiry: string; // e.g., "WEEKLY", "MONTHLY", or "2024-11-28"
  strikeGap?: number;
}

export const runStrategy = async (params: ExecuteStrategyParams): Promise<any> => {
    const apiParams: any = {
        strategyType: params.strategyType,
        instrumentType: params.instrumentType,
        expiry: params.expiry,
    };

    if (params.strategyType === StrategyType.OTM_STRANGLE && params.strikeGap) {
        apiParams.strikeGap = params.strikeGap;
    }
    
    return api.executeStrategy(apiParams);
};

export const getActiveStrategies = (): Promise<StrategyPosition[]> => {
    return api.getActiveStrategies();
};
