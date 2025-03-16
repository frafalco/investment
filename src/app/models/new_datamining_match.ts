export interface NewDataMiningMatch {
    id: number;
    date: string;
    hour: string;
    match: string;
    result: string;
    halftime_result: string;
    home_goals: number;
    home_goalsht: number;
    away_goals: number;
    away_goalsht: number;
    same_match: number;
    home_perc: number;
    draw_perc: number;
    away_perc: number;
    mge: number;
    diff: number;
    goal_perc: number;
    ov15_perc: number;
    ov25_perc: number;
    un35_perc: number;
    ov05ht_perc: number;
    ic: number;
    rc: number;
    ro: number;
    igbc: number;
    igbo: number;
}