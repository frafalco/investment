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

  // Funzione per ripristinare la sessione all'avvio dell'app
  async restoreSession() {
    const { data } = await this.supabase.auth.getSession();
    try {
      if (data.session) {
        this.user_id = data.session.user.id;
      }
      this.store.dispatch(ProfileActions.loadProfile());
    } catch (exception) {
      console.log(exception);
    }
    // this.supabase
    //   .channel('profiles')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*',
    //       schema: 'public',
    //       table: 'profiles',
    //       filter: `id=eq.${this.getUser()?.id}`,
    //     },
    //     (payload) => {
    //     }
    //   )
    //   .subscribe();
    // //listen strategies table
    // this.supabase
    //   .channel('strategies')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*',
    //       schema: 'public',
    //       table: 'strategies',
    //       filter: `user_id=eq.${this.getUser()?.id}`,
    //     },
    //     async (payload) => {
    //     }
    //   )
    //   .subscribe();
    // //listen bets table
    // this.supabase
    //   .channel('bets')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: 'INSERT',
    //       schema: 'public',
    //       table: 'bets',
    //       filter: `user_id=eq.${this.getUser()?.id}`,
    //     },
    //     (payload) => {
    //     }
    //   )
    //   .subscribe();
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

  async insertBet(bet: Bet) {
    try {
      const { data, error } = await this.supabase.from('bets').insert(bet);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  updateBetAndStrategy(item: Bet, strategy: Strategy): Observable<Bet> {
    let currentProfit = 0;
    currentProfit = strategy.profit ?? 0;
    currentProfit = currentProfit + item.profit!;
    const bet: Bet = {
      ...item,
      cumulated_profit: currentProfit
    }
    //update bet
    const updateBetQuery = this.supabase.from('bets').upsert(bet).select<'*', Bet>().single();
    //update strategy
    const updateStrategyQuery = this.supabase.from('strategies').update({profit: currentProfit}).eq('id', strategy.id);
    return from(
      updateStrategyQuery.then(async ({error}) => {
        if(error) {
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

  async deleteBet(bet: Bet) {
    try {
      // const currentUserInfo = this.userInfoSubject.getValue();
      // if (currentUserInfo.profile) {
      //   const currentStrategy = currentUserInfo.strategies.find(
      //     (elem) => elem.id === bet.strategy_id
      //   );
      //   if (currentStrategy) {
      //     let currentProfit = 0;
      //     currentProfit = currentStrategy.profit ?? 0;
      //     currentProfit = currentProfit - bet.profit!;
      //     //update bet
      //     const { error: deleteError } = await this.supabase
      //       .from('bets')
      //       .delete()
      //       .eq('id', bet.id);

      //     if (deleteError) {
      //       throw deleteError;
      //     }

      //     currentStrategy.profit = currentProfit;
      //     //update strategy
      //     await this.supabase.from('strategies').upsert(currentStrategy);
      //   }
      // }
      return;
    } catch (error) {
      throw error;
    }
  }

  async getBets(): Promise<Bet[]> {
    const { data, error } = await this.supabase
      .from('bets')
      .select<'*', Bet>()
      .order('date');
    if (error) {
      throw error;
    }
    return data;
  }

  // Ottenere l'utente corrente
  // getUser() {
  //   return this.userSubject.getValue();
  // }

  // Verificare se l'utente è autenticato
  // isAuthenticated(): boolean {
  //   return !!this.userSubject.getValue();
  // }

  async updateProfile(id: string, usernameFromTable: string) {
    const username = usernameFromTable !== '' ? usernameFromTable : null;
    const update = {
      id,
      username,
      updated_at: new Date(),
    };

    const { data, error } = await this.supabase.from('profiles').upsert(update);
    return { data, error };
  }

  async addStrategy(newStrategy: {
    name: string | null;
    starting_bankroll: number | null;
  }) {
    await this.supabase.from('strategies').insert(newStrategy);
  }
}
