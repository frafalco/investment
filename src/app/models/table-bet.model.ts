export interface TableBet {
    id?: number;
    date?: string;
    bookmaker: string;
    odds?: number;
    unit: number;
    bet: number;
    result: string;
    profit?: number;
    cumulated_profit?: number;
    strategy_id: number;
    event: string;
    updated_at?: string;
    sub_bets?: SubBet[];
}

export interface SubBet {
    unit: number;
    bet: number;
    result: string;
    profit?: number;
    cumulated_profit?: number;
}