import { Injectable } from '@angular/core';
import {
  AuthError,
  createClient,
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

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  user_id?: string;

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
    } catch (exception) {
      
    }
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

    const query = this.supabase.from('profiles').upsert(update).select<'*, strategies(*, bets(*))', Profile>('*, strategies(*, bets(*))').single();
    return from(
      query.then(({data, error}) => {
        if(error) {
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

  upsertStrategy(id: number | null,name: string | null, starting_bankroll: number | null, str_type: string | null): Observable<Strategy> {
    const query = this.supabase
      .from('strategies')
      .upsert({id: id === null ? undefined : id, name, starting_bankroll, type: str_type})
      .select<'*', Strategy>()
      .single();

    return from(
      query.then( async ({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        const { error: error_1 } = await this.supabase.rpc('add_selected_strategy', {user_id: this.user_id, new_strategy: {id: data.id, name: data.name}});
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

  updateBetAndStrategy(item: Bet, previousProfit: number): Observable<{bet: Bet, profit: number}> {
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
        const { data: profit, error: error_1 } = await this.supabase.rpc('increment_profit', {
          increment_by: data.profit! - previousProfit,
          strategy_id: data.strategy_id
        });
        if (error_1) {
          throw new Error(error_1.message);
        }
        return {bet: data, profit};
      })
    );
  }

  deleteBet(bet: Bet): Observable<{bet: Bet, profit: number}> {
    //update bet
    const deleteBetQuery = this.supabase.from('bets').delete().eq('id', bet.id).select<'*', Bet>().single();

    return from(
      deleteBetQuery.then( async ({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        const { data: profit, error: error_1 } = await this.supabase.rpc('increment_profit', {
          increment_by: -data.profit!,
          strategy_id: data.strategy_id
        });
        if (error_1) {
          throw new Error(error_1.message);
        }
        return {bet: data, profit};
      })
    );
  }

  deleteStrategy(strategy_id: number): Observable<Strategy> {
    const deleteStrategyQuery = this.supabase.from('strategies').delete().eq('id', strategy_id).select<'*', Strategy>().single();

    return from(
      deleteStrategyQuery.then( async ({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        return data;
      })
    );
  }

  updateSelectedStrategies(strategies_selected: SelectedStrategy[] | null): Observable<Profile> {
    const query = this.supabase.from('profiles').update({selected_strategies: strategies_selected}).eq('id', this.user_id).select<'*, strategies(*, bets(*))', Profile>('*, strategies(*, bets(*))').single();

    return from(query.then(({ data, error}) => {
        if (error) {
          throw new Error(error.message);
        }
        return data;
      })
    );
  }
}
