import { Bet } from "./bet.model";
import { Bonus } from "./bonus.model";

export interface Strategy {
    id: number;
    name: string;
    type: string;
    starting_bankroll: number;
    profit: number;
    user_id: string;
    bets: Bet[];
    bonus: Bonus[];
    total_wagered: number;
    archived: boolean;
}