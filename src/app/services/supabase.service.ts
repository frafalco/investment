import { Injectable } from '@angular/core';
import {
  createClient,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Bet, Profile, Strategy, UserInfo } from '../bean/beans';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  private userInfoSubject = new BehaviorSubject<UserInfo>(new UserInfo(true));
  userInfo$ = this.userInfoSubject.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    this.restoreSession();
  }

  // Funzione per ripristinare la sessione all'avvio dell'app
  async restoreSession() {
    const { data } = await this.supabase.auth.getSession();
    const userInfo = this.userInfoSubject.getValue();
    try {
      if (data.session) {
        this.userSubject.next(data.session.user);
        const { data: profile, error: errorProfile } = await this.supabase
          .from('profiles')
          .select<'*', Profile>()
          .eq('id', data.session.user.id)
          .single();
        if (errorProfile) {
          throw errorProfile;
        }
        userInfo.profile = profile;
        const { data: strategies, error: errorStrategies } = await this.supabase
          .from('strategies')
          .select<'*', Strategy>()
          .eq('user_id', data.session.user.id);
        if (errorStrategies) {
          throw errorStrategies;
        }
        userInfo.strategies = strategies;
        const { data: bets, error: errorBets } = await this.supabase
          .from('bets')
          .select<'*', Bet>();
        if (errorBets) {
          throw errorBets;
        }
        userInfo.bets = bets;
      }
    } catch (exception) {
      console.log(exception);
    }
    userInfo.loading = false;
    console.log(userInfo);
    this.userInfoSubject.next(userInfo);
    //listen profiles table
    this.supabase
      .channel('profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${this.getUser()?.id}`,
        },
        (payload) => {
          const profile = payload.new as Profile;
          userInfo.profile = profile;
          this.userInfoSubject.next(userInfo);
        }
      )
      .subscribe();
    //listen strategies table
    this.supabase
      .channel('strategies')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'strategies',
          filter: `user_id=eq.${this.getUser()?.id}`,
        },
        async (payload) => {
          const strategy = payload.new as Strategy;
          const userInfo = this.userInfoSubject.getValue();
          userInfo.updateStrategy(strategy);

          
          const { data: bets, error: errorBets } = await this.supabase
            .from('bets')
            .select<'*', Bet>();
          if (errorBets) {
            throw errorBets;
          }
          userInfo.bets = bets;

          this.userInfoSubject.next(userInfo);
        }
      )
      .subscribe();
    //listen bets table
    this.supabase
      .channel('bets')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bets',
          filter: `user_id=eq.${this.getUser()?.id}`,
        },
        (payload) => {
          const bet = payload.new as Bet;
          const userInfo = this.userInfoSubject.getValue();
          userInfo.addBet(bet);
          this.userInfoSubject.next(userInfo);
        }
      )
      .subscribe();
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

  async updateBetAndStrategy(item: Bet) {
    const currentUserInfo = this.userInfoSubject.getValue();
    if (currentUserInfo.profile) {
      const currentStrategy = currentUserInfo.strategies.find(
        (elem) => elem.id === item.strategy_id
      );
      if (currentStrategy) {
        let currentProfit = 0;
        currentProfit = currentStrategy.profit ?? 0;
        currentProfit = currentProfit + item.profit!;
        item.cumulated_profit = currentProfit;
        //update bet
        await this.supabase.from('bets').upsert(item);
        currentStrategy.profit = currentProfit;
        //update strategy
        await this.supabase.from('strategies').upsert(currentStrategy);
      }
    }
    return;
  }

  async deleteBet(bet: Bet) {
    try {
      const currentUserInfo = this.userInfoSubject.getValue();
      if (currentUserInfo.profile) {
        const currentStrategy = currentUserInfo.strategies.find(
          (elem) => elem.id === bet.strategy_id
        );
        if (currentStrategy) {
          let currentProfit = 0;
          currentProfit = currentStrategy.profit ?? 0;
          currentProfit = currentProfit - bet.profit!;
          //update bet
          const { error: deleteError } = await this.supabase
            .from('bets')
            .delete()
            .eq('id', bet.id);

          if (deleteError) {
            throw deleteError;
          }

          currentStrategy.profit = currentProfit;
          //update strategy
          await this.supabase.from('strategies').upsert(currentStrategy);
        }
      }
      return;
    } catch (error) {
      throw error;
    }
  }

  async getBets(): Promise<Bet[]> {
    const { data, error } = await this.supabase
      .from('bets')
      .select<'*', Bet>()
      .eq('user_id', this.getUser()!.id)
      .order('date');
    if (error) {
      throw error;
    }
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
    this.userSubject.next(data.user); // Aggiorna lo stato dell'utente
    await this.restoreSession();
    return data;
  }

  async signOut() {
    this.userInfoSubject.next(new UserInfo(true));
    console.log('SignOut');
    await this.supabase.auth.signOut();
    this.userSubject.next(null);
    this.userInfoSubject.next(new UserInfo(false));
  }

  // Ottenere l'utente corrente
  getUser() {
    return this.userSubject.getValue();
  }

  // Verificare se l'utente è autenticato
  isAuthenticated(): boolean {
    return !!this.userSubject.getValue();
  }

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

  async addStrategy(newStrategy: {name: string | null, starting_bankroll: number | null}) {
    await this.supabase.from('strategies').insert(newStrategy);
  }
}
