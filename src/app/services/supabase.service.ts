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

  addStrategy(name: string | null, starting_bankroll: number | null, str_type: string | null): Observable<Strategy> {
    const query = this.supabase
      .from('strategies')
      .insert({name, starting_bankroll, type: str_type})
      .select<'*', Strategy>()
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

  updateBetAndStrategy(item: Bet, strategy: Strategy, previousProfit: number): Observable<Bet> {
    let currentProfit = 0;
    currentProfit = strategy.profit ?? 0;
    currentProfit = currentProfit - previousProfit + item.profit!;
    const bet: Bet = {
      ...item,
    };
    //update bet
    const updateBetQuery = this.supabase
      .from('bets')
      .upsert(bet)
      .select<'*', Bet>()
      .single();
    //update strategy
    const updateStrategyQuery = this.supabase
      .from('strategies')
      .update({ profit: currentProfit })
      .eq('id', strategy.id);
    return from(
      updateStrategyQuery.then(async ({ error }) => {
        if (error) {
          throw new Error(error.message);
        }
        const { data, error: error_1 } = await updateBetQuery;
        if (error_1) {
          throw new Error(error_1.message);
        }
        return data;
      })
    );
  }

  deleteBet(bet: Bet, strategy: Strategy): Observable<Bet> {
    let currentProfit = 0;
    currentProfit = strategy.profit ?? 0;
    currentProfit = currentProfit - bet.profit!;
    //update bet
    const deleteBetQuery = this.supabase.from('bets').delete().eq('id', bet.id).select<'*', Bet>().single();
    //update strategy
    const updateStrategyQuery = this.supabase
      .from('strategies')
      .update({ profit: currentProfit })
      .eq('id', strategy.id);

    return from(
      updateStrategyQuery.then( async ({ error }) => {
        if (error) {
          throw new Error(error.message);
        }
        const { data, error: error_1 } = await deleteBetQuery;
        if (error_1) {
          throw new Error(error_1.message);
        }
        return data;
      })
    );
  }
}
