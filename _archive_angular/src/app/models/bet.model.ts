export interface Bet {
    id?: number;
    date?: string;
    bookmaker?: string;
    odds?: number;
    unit: number;
    bet: number;
    result: string;
    profit?: number;
    strategy_id: number;
    event: string;
    updated_at?: string;
}