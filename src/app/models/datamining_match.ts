export interface DataMiningMatch {
    id: number;
    fixture_id: number;
    event_date: string;
    homeTeam: string;
    awayTeam: string;
    tot_number: number;
    uno: number;
    pareggio: number;
    due: number;
    gol: number;
    over15: number;
    over25: number;
    under35: number;
    over05pt: number;
    golospite: number;
    risultati: Map<string, number>;
    goals_home: number | null;
    goals_away: number | null;
    score_ht_home: number | null;
    score_ht_away: number | null;
    canceled: boolean;
}