
import { NeutralMarketLog, NeutralMarketSummary, BacktestApiResponse, MarketRegime, BreakoutRisk } from '../types';

// Keep in sync with services/kiteConnect.ts BASE_URL
const BASE_URL = 'http://localhost:8080/api/market-analysis';

// --- Fetch Helper ---

async function marketAnalysisFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<BacktestApiResponse<T>> {
    const token = localStorage.getItem('jwtToken');
    const userId = localStorage.getItem('userId');
    const headers: Record<string, string> = {};

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (userId) headers['X-User-Id'] = userId;
    if (options.body) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    if (response.status === 404) {
        return { success: false, message: 'Not found', data: null };
    }

    const body: BacktestApiResponse<T> = await response.json();

    if (response.status === 400) {
        throw new Error(body.message || 'Validation error');
    }

    return body;
}

// --- Query String Builder ---

function buildQuery(params: Record<string, string | undefined> | { [key: string]: string | undefined }): string {
    const parts = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`);
    return parts.length ? `?${parts.join('&')}` : '';
}

// --- API Client ---

export interface LogsQueryParams {
    date?: string;
    from?: string;
    to?: string;
    instrument?: string;
}

export const marketAnalysisApi = {
    /** Get neutral market evaluation logs */
    getLogs: (params: LogsQueryParams = {}): Promise<BacktestApiResponse<NeutralMarketLog[]>> =>
        marketAnalysisFetch<NeutralMarketLog[]>(
            `/neutral-market-logs${buildQuery(params as Record<string, string | undefined>)}`
        ),

    /** Get aggregated summary for a single day */
    getSummary: (date?: string): Promise<BacktestApiResponse<NeutralMarketSummary>> =>
        marketAnalysisFetch<NeutralMarketSummary>(
            `/neutral-market-summary${buildQuery({ date })}`
        ),
};

// --- Label Helpers ---

export function getRegimeLabel(regime: MarketRegime): { label: string; colorClass: string; bgClass: string } {
    switch (regime) {
        case 'STRONG_NEUTRAL':
            return { label: 'Strong Neutral', colorClass: 'text-green-400', bgClass: 'bg-green-500/20 text-green-400' };
        case 'WEAK_NEUTRAL':
            return { label: 'Weak Neutral', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-500/20 text-yellow-400' };
        case 'TRENDING':
            return { label: 'Trending', colorClass: 'text-red-400', bgClass: 'bg-red-500/20 text-red-400' };
        default:
            return { label: regime, colorClass: 'text-slate-400', bgClass: 'bg-slate-500/20 text-slate-400' };
    }
}

export function getBreakoutRiskLabel(risk: BreakoutRisk): { label: string; colorClass: string; bgClass: string } {
    switch (risk) {
        case 'LOW':
            return { label: 'Low', colorClass: 'text-green-400', bgClass: 'bg-green-500/20 text-green-400' };
        case 'MEDIUM':
            return { label: 'Medium', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-500/20 text-yellow-400' };
        case 'HIGH':
            return { label: 'High', colorClass: 'text-red-400', bgClass: 'bg-red-500/20 text-red-400' };
        default:
            return { label: risk, colorClass: 'text-slate-400', bgClass: 'bg-slate-500/20 text-slate-400' };
    }
}

// --- Formatting Helpers ---

export const formatConfidence = (value: number): string => `${(value * 100).toFixed(1)}%`;

export const formatScore = (value: number, max: number): string => `${value}/${max}`;

export const formatTimeFromISO = (isoDateTime: string): string => {
    const timePart = isoDateTime.split('T')[1];
    return timePart ? timePart.substring(0, 8) : isoDateTime;
};
