export interface Profile {
    id: string;
    username?: string;
    email: string;
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
    date?: string;
    bookmaker: string;
    odds: number;
    stake: number;
    bet: number;
    result: string;
    profit?: number;
    cumulated_profit?: number;
    strategy_id: number;
    event: string;
    updated_at?: string;
}

export class UserInfo {
    private _profile: Profile | null;
    private _strategies: Strategy[];
    private _bets: Bet[];
    private _loading: boolean;

    constructor(loading: boolean) {
        this._profile = null;
        this._strategies = [];
        this._bets = [];
        this._loading = loading;
    }

    public get profile(): Profile | null {
        return this._profile;
    }

    public set profile(profile: Profile) {
        this._profile = profile;
    }

    public get strategies() {
        return this._strategies.sort((a, b) => a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1);
    }

    public set strategies(strategies: Strategy[]) {
        this._strategies = strategies;
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

    public set bets(bets: Bet[]) {
        this._bets = bets;
    }

    public addBet(bet: Bet) {
        this._bets.push(bet);
    }

    public get loading() {
        return this._loading;
    }

    public set loading(loading: boolean) {
        this._loading = loading;
    }
}