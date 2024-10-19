export interface Profile {
    id: string;
    username?: string;
}

export interface Strategy {
    id: number;
    name: string;
    starting_bankroll: number;
    profit: number;
    user_id: string;
}

export interface Bet {
    id?: number;
    date: string;
    bookmaker: string;
    odds: number;
    stake: number;
    bet: number;
    result: string;
    profit?: number;
    cumulated_profit?: number;
    strategy_id: number;
}

export class UserInfo {
    private _profile: Profile | null;
    private _strategies: Strategy[];
    private _bets: Bet[];

    constructor() {
        this._profile = null;
        this._strategies = [];
        this._bets = [];
    }

    public get profile(): Profile | null {
        return this._profile;
    }

    public set profile(profile: Profile) {
        this._profile = profile;
    }

    public get strategies() {
        return this._strategies;
    }

    public updateStrategy(strategy: Strategy) {
        const index = this._strategies.findIndex(elem => elem.id === strategy.id);
        if(index > -1) {
            this._strategies[index] = strategy;
        } else {
            this._strategies.push(strategy);
        }
    }

    public get bets() {
        return this._bets;
    }

    public updateBets(bet: Bet) {
        const index = this._bets.findIndex(elem => elem.id === bet.id);
        if(index > -1) {
            this._bets[index] = bet;
        } else {
            this._bets.push(bet);
        }
    }
}