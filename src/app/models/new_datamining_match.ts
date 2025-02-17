export interface NewDataMiningMatch {
    id: number;
    date: number;
    hour: string;
    match: string;
    result: number;
    home_goals: number;
    away_goals: number;
    same_match: number;
    ov25_perc: number;
}