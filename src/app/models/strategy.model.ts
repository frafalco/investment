import { Bet } from "./bet.model";

export interface Strategy {
    id: number;
    name: string;
    type: string;
    starting_bankroll: number;
    profit: number;
    user_id: string;
    bets: Bet[];
}