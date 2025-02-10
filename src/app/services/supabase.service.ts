import { Injectable, OnDestroy } from '@angular/core';
import {
  AuthError,
  createClient,
  RealtimeChannel,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, from, Observable, of, throwError } from 'rxjs';
import { Profile } from '../models/profile.model';
import { Bet } from '../models/bet.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import * as ProfileActions from '../store/profile.actions';
import { Strategy } from '../models/strategy.model';
import { SelectedStrategy } from '../models/selected-strategy.model';
import { BetBT } from '../models/bet_bt.model';
import { DataMiningMatch } from '../models/datamining_match';
import { OverMatch } from '../models/over_match';
import { Bonus } from '../models/bonus.model';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService implements OnDestroy {
  private supabase: SupabaseClient;
  user_id?: string;

  strategiesBTSubscription!: RealtimeChannel;
  // betsBTSubscription!: RealtimeChannel;
  strategiesBT = new BehaviorSubject<{id: number, created_at: string, name: string, profit: number, betsBT: {date: string, event: string, odds: number, bet: number, result: string, profit: number}[]}[]>([]);

  constructor(private store: Store<AppState>) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    this.restoreSession();
  }

  async restoreSession() {
    const { data } = await this.supabase.auth.getSession();
    try {
      if (data.session) {
        this.user_id = data.session.user.id;
      }
      this.store.dispatch(ProfileActions.loadProfile());
    } catch (exception) {}
  }

  getProfile(): Observable<Profile> {
    if (!this.user_id) {
      return throwError(() => new Error('No logged user'));
    }
    const query = this.supabase
      .from('profiles')
      .select<'*, strategies(*, bets(*), bonus(*))', Profile>('*, strategies(*, bets(*), bonus(*))')
      .eq('id', this.user_id)
      .single();
    return from(
      query.then(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        return data;
      })
    );
  }

  updateProfile(username: string): Observable<Profile> {
    const usrn = username ? username : null;
    const update = {
      id: this.user_id,
      username: usrn,
      updated_at: new Date(),
    };

    const query = this.supabase
      .from('profiles')
      .upsert(update)
      .select<'*, strategies(*, bets(*), bonus(*))', Profile>('*, strategies(*, bets(*), bonus(*))')
      .single();
    return from(
      query.then(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        return data;
      })
    );
  }

  signIn(email: string, password: string): Observable<void> {
    const signin = this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    return from(
      signin.then(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        this.user_id = data.user.id;
        return;
      })
    );
  }

  signOut(): Observable<void> {
    const signout = this.supabase.auth.signOut();
    return from(
      signout.then((value: { error: AuthError | null }) => {
        if (value.error) {
          throw new Error(value.error.message);
        }
        return;
      })
    );
  }

  upsertStrategy(
    id: number | null,
    name: string | null,
    starting_bankroll: number | null,
    str_type: string | null,
    archived: boolean | null
  ): Observable<Strategy> {
    const query = this.supabase
      .from('strategies')
      .upsert({
        id: id === null ? undefined : id,
        name,
        starting_bankroll,
        type: str_type,
        archived
      })
      .select<'*', Strategy>()
      .single();

    return from(
      query.then(async ({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        if(!id) {
          const { error: error_1 } = await this.supabase.rpc(
            'add_selected_strategy',
            {
              user_id: this.user_id,
              new_strategy: { id: data.id, name: data.name },
            }
          );
          if (error_1) {
            throw new Error(error_1.message);
          }
        }
        return data;
      })
    );
  }

  insertBet(bet: Bet): Observable<Bet> {
    const query = this.supabase
      .from('bets')
      .insert(bet)
      .select<'*', Bet>()
      .single();

    return from(
      query.then(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        return data;
      })
    );
  }

  insertBonus(bonus: Bonus): Observable<Bonus> {
    const query = this.supabase
      .from('bonus')
      .insert(bonus)
      .select<'*', Bonus>()
      .single();

    return from(
      query.then(async ({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        const { data: profit, error: error_1 } = await this.supabase.rpc(
          'increment_profit',
          {
            increment_by: data.amount!,
            strategy_id: data.strategy_id,
          }
        );
        if (error_1) {
          throw new Error(error_1.message);
        }
        return data;
      })
    );
  }

  updateBetAndStrategy(
    item: Bet,
    previousProfit: number
  ): Observable<{ bet: Bet; profit: number }> {
    const bet: Bet = {
      ...item,
    };
    //update bet
    const updateBetQuery = this.supabase
      .from('bets')
      .upsert(bet)
      .select<'*', Bet>()
      .single();

    return from(
      updateBetQuery.then(async ({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        const { data: profit, error: error_1 } = await this.supabase.rpc(
          'increment_profit',
          {
            increment_by: data.profit! - previousProfit,
            strategy_id: data.strategy_id,
          }
        );
        if (error_1) {
          throw new Error(error_1.message);
        }
        return { bet: data, profit };
      })
    );
  }

  deleteBet(bet: Bet): Observable<{ bet: Bet; profit: number }> {
    //update bet
    const deleteBetQuery = this.supabase
      .from('bets')
      .delete()
      .eq('id', bet.id)
      .select<'*', Bet>()
      .single();

    return from(
      deleteBetQuery.then(async ({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        const { data: profit, error: error_1 } = await this.supabase.rpc(
          'increment_profit',
          {
            increment_by: -data.profit!,
            strategy_id: data.strategy_id,
          }
        );
        if (error_1) {
          throw new Error(error_1.message);
        }
        return { bet: data, profit };
      })
    );
  }

  deleteStrategy(strategy_id: number): Observable<Strategy> {
    const deleteStrategyQuery = this.supabase
      .from('strategies')
      .delete()
      .eq('id', strategy_id)
      .select<'*', Strategy>()
      .single();

    return from(
      deleteStrategyQuery.then(async ({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        return data;
      })
    );
  }

  updateSelectedStrategies(
    strategies_selected: SelectedStrategy[] | null
  ): Observable<Profile> {
    const query = this.supabase
      .from('profiles')
      .update({ selected_strategies: strategies_selected })
      .eq('id', this.user_id)
      .select<'*, strategies(*, bets(*))', Profile>('*, strategies(*, bets(*))')
      .single();

    return from(
      query.then(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        return data;
      })
    );
  }

  async selectDataMiningMatches(underPercentage: number, sameMatchNumber: number, xPercentage: number) {
    const {data, error} = await this.supabase.from('data_mining').select<'*', DataMiningMatch>('*').gte('tot_number', sameMatchNumber).lte('over25', underPercentage).gte('pareggio', xPercentage).order('event_date', {ascending: true});
    if(error) {
      throw new Error(error.message);
    }

    return data;
  }

  async selectDataMiningMatchesOver25(underPercentage: number, sameMatchNumber: number, xPercentage: number) {
    const {data, error} = await this.supabase.from('data_mining').select<'*', DataMiningMatch>('*').gte('tot_number', sameMatchNumber).lte('over25', underPercentage).gte('pareggio', xPercentage).order('event_date', {ascending: true});
    if(error) {
      throw new Error(error.message);
    }

    return data;
  }

  async selectOver05Matches(index: number, delta: number, diff: number, mge: number, homePercentage: number, awayPercentage: number) {
    const {data, error} = await this.supabase.from('over_05')
      .select<'*', OverMatch>('*')
      .lte('index', index)
      .lte('delta', delta / 100)
      .lte('diff', diff)
      .gte('mge', mge)
      .or(`percentage_ov05home.gte.${homePercentage / 100}, percentage_ov05away.gte.${awayPercentage / 100}`)
      // .gte('percentage_ov05home', homePercentage / 100)
      // .gte('percentage_ov05away', awayPercentage / 100)
      .order('date', {ascending: true});
    if(error) {
      throw new Error(error.message);
    }

    return data;
  }

  async selectDataMiningMatchesWithoutGoal() {
    const {data, error} = await this.supabase.from('data_mining').select<'*', DataMiningMatch>('*').is('score_ht_home', null).is('canceled', false);
    if(error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateDataMining(id: number, updatedData: any) {
    const {data, error} = await this.supabase.from('data_mining').update(updatedData).eq('fixture_id', id).select<'*', DataMiningMatch>('*').single();
    if(error) {
      throw new Error(error.message);
    }

    return data;
  }

  ngOnDestroy() {
      this.strategiesBTSubscription.unsubscribe();
      // this.betsBTSubscription.unsubscribe();
  }
}
