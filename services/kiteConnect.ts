/**
 * This service acts as the API client for the trading bot backend.
 * It implements the API specification provided, handling authentication and data fetching.
 */
import { StrategyPosition, ApiStrategyType, ApiInstrument, UserProfile, MonitoringStatus, Order, Position } from '../types';

const BASE_URL = 'https://zerodhabot-genai-3.onrender.com/api';
//const BASE_URL = 'http://localhost:8080/api';

// --- Helper Functions ---
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('jwtToken');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, { 
        ...options, 
        headers: {...headers, ...options.headers} 
    });

    // Handle cases with no content in response body
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return null as T;
    }
    
    const data = await response.json();

    if (!response.ok || (data.hasOwnProperty('success') && !data.success)) {
        const errorMessage = data.message || `HTTP error! status: ${response.status}`;
        console.error(`API Error on ${endpoint}:`, errorMessage, data);
        if (response.status === 401) {
            throw new Error('Unauthorized');
        }
        throw new Error(errorMessage);
    }

    // The new API nests the actual data inside a 'data' property
    return data.data;
}

// --- Authentication ---
// Corresponds to /api/auth/login-url
export const getLoginUrl = (): Promise<string> => {
    return apiFetch<string>('/auth/login-url');
};

interface SessionData {
    userId: string;
    userName: string;
    accessToken: string;
}
// Corresponds to /api/auth/session
export const exchangeToken = async (requestToken: string): Promise<{ jwtToken: string }> => {
    const sessionData = await apiFetch<SessionData>('/auth/session', {
        method: 'POST',
        body: JSON.stringify({ requestToken }),
    });
    // Map accessToken from new API to jwtToken for compatibility with the app
    return { jwtToken: sessionData.accessToken };
};

// Corresponds to /api/auth/profile
export const getUserProfile = (): Promise<UserProfile> => apiFetch('/auth/profile');

// --- Strategy & Instrument APIs ---

// Updated to use the new /api/market/ltp endpoint
export const getLTP = async (instrumentName: string): Promise<number> => {
    // Note: The new API uses instrument names like "NIFTY 50".
    // We are assuming NSE as the exchange for these index instruments.
    const instrumentIdentifier = `NSE:${instrumentName}`;
    const response = await apiFetch<{ [key: string]: { lastPrice: number } }>(`/market/ltp?instruments=${encodeURIComponent(instrumentIdentifier)}`);

    if (response && response[instrumentIdentifier] && typeof response[instrumentIdentifier].lastPrice === 'number') {
        return response[instrumentIdentifier].lastPrice;
    }
    
    console.error(`Unexpected LTP response structure for ${instrumentIdentifier}:`, response);
    return 0;
};

export const getStrategyTypes = (): Promise<ApiStrategyType[]> => apiFetch('/strategies/types');

export const getTradeableInstruments = (): Promise<ApiInstrument[]> => apiFetch('/strategies/instruments');

export const getStrategyExpiries = (instrumentType: string): Promise<string[]> => apiFetch(`/strategies/expiries/${instrumentType}`);

export const executeStrategy = (params: any): Promise<any> => apiFetch('/strategies/execute', {
    method: 'POST',
    body: JSON.stringify(params),
});

export const getActiveStrategies = (): Promise<StrategyPosition[]> => apiFetch('/strategies/active');

// --- Portfolio & Order APIs ---
export const getOrders = (): Promise<Order[]> => apiFetch('/orders');

export const getPositions = async (): Promise<Position[]> => {
    const response = await apiFetch<{ net: Position[], day: Position[] }>('/portfolio/positions');
    return response.net ?? [];
};


// --- Position Monitoring APIs ---

// GET /api/monitoring/status
export const getMonitoringStatus = (): Promise<MonitoringStatus> => apiFetch('/monitoring/status');

// DELETE /api/monitoring/{executionId}
export const stopMonitoringExecution = (executionId: string): Promise<string> => apiFetch(`/monitoring/${executionId}`, {
    method: 'DELETE',
});
