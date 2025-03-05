export interface NewDataMiningMatch {
    id: number;
    date: number;
    hour: string;
    match: string;
    result: number;
    home_goals: number;
    home_goalsht: number;
    away_goals: number;
    away_goalsht: number;
    same_match: number;
    ov25_perc: number;
}