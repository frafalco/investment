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
    this.changesSubscription();
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
      .select<'*, strategies(*, bets(*))', Profile>('*, strategies(*, bets(*))')
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
    str_type: string | null
  ): Observable<Strategy> {
    const query = this.supabase
      .from('strategies')
      .upsert({
        id: id === null ? undefined : id,
        name,
        starting_bankroll,
        type: str_type,
      })
      .select<'*', Strategy>()
      .single();

    return from(
      query.then(async ({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
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

  async insertStrategyBT(name: string) {
    await this.supabase.from('strategiesBT').insert({ name });
  }

  async updateStrategyBTName(name: string, id: number) {
    await this.supabase.from('strategiesBT').update({ name }).eq('id', id);
  }

  async selectStrategiesBT() {
    const { data: strategies, error } = await this.supabase.from('strategiesBT').select('*, betsBT(*)');

    if(error) {
      throw new Error(error.message);
    }

    this.strategiesBT.next(strategies);
  }

  selectStrategyBTByID(id: number) {
    const query = this.supabase.from('strategiesBT').select('*, betsBT(*)').eq('id', id).single();

    return from(
      query.then(({data, error}) => {
        if(error) {
          throw new Error(error.message);
        }
        const profit = data.betsBT.reduce((acc: number, elem: any) => acc + elem.profit, 0);
        const totalWagered = data.betsBT.reduce((acc: number, elem: any) => acc + elem.bet, 0);
        const strategy: Strategy = {
          id: data.id,
          name: data.name,
          type: 'BT',
          starting_bankroll: 1000,
          profit: profit,
          user_id: '',
          bets: data.betsBT.map((b: any) => ({...b, bookmaker: 'Fixed'})),
          total_wagered: totalWagered
        }
        return strategy;
      })
    )
  }

  async insertBetsBT(bets: {date: string, event: string, odds: number, bet: number, result: string, profit: number, strategy_id: number}[]) {
    await this.supabase.from('betsBT').insert(bets);
  }

  changesSubscription() {
    this.selectStrategiesBT();
    this.strategiesBTSubscription = this.supabase
      .channel('strategiesBT-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'strategiesBT' },
        (payload) => {
          this.selectStrategiesBT();
        }
      )
      .subscribe();
    // this.betsBTSubscription = this.supabase
    //     .channel('betsBT-all-channel')
    //     .on(
    //       'postgres_changes',
    //       { event: '*', schema: 'public', table: 'betsBT' },
    //       (payload) => {
    //         this.selectStrategiesBT();
    //       }
    //     )
    //     .subscribe();
  }

  ngOnDestroy() {
      this.strategiesBTSubscription.unsubscribe();
      // this.betsBTSubscription.unsubscribe();
  }
}
