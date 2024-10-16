import { Injectable } from '@angular/core';
import {
  createClient,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

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
  user_id: string;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  private session: Session | null = null;

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
    if (data.session) {
      this.session = data.session; // Mantieni la sessione
      this.userSubject.next(data.session.user);
    }
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

  async deleteBet(bet: Bet) {
    try {
      const { error: deleteError } = await this.supabase
        .from('bets')
        .delete()
        .eq('id', bet.id);

      if (deleteError) {
        throw deleteError;
      }

      const currentUser = this.getUser();
      let currentProfit = 0;
      if (currentUser) {
        currentProfit = currentUser.user_metadata['profit'] ?? 0;
      }
      const update = {
        id: currentUser!.id,
        profit: currentProfit - bet.profit!,
        updated_at: new Date(),
      };
      const { data: updatedUser, error: updateError } = await this.supabase
        .from('profiles')
        .upsert(update)
        .select()
        .single();

      // TODO capire se aggiornare la ROI
      if (updatedUser) {
        const { data, error } = await this.supabase.auth.updateUser({
          data: {
            profit: updatedUser.profit,
            roi: updatedUser.profit / updatedUser.starting_bankroll,
          },
        });

        this.userSubject.next(data.user); // Aggiorna lo stato dell'utente
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
    this.session = data.session; // Mantieni la sessione
    this.userSubject.next(data.user); // Aggiorna lo stato dell'utente
    return data;
  }

  signOut() {
    console.log('SignOut');
    this.supabase.auth.signOut();
    this.userSubject.next(null);
  }

  // Ottenere l'utente corrente
  getUser() {
    return this.userSubject.getValue();
  }

  // Verificare se l'utente è autenticato
  isAuthenticated(): boolean {
    return !!this.userSubject.getValue();
  }

  async updateProfile(user: User, username: string, starting_bankroll: number) {
    const update = {
      id: user.id,
      username,
      starting_bankroll,
      updated_at: new Date(),
    };

    await this.supabase.from('profiles').upsert(update);
    const { data, error } = await this.supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        username,
        starting_bankroll,
        profit: 0,
        roi: 0,
      },
    });
    this.userSubject.next(data.user); // Aggiorna lo stato dell'utente
    return { data, error };
  }

  async updateBetAndUser(user: User, item: Bet) {
    await this.supabase.from('bets').upsert(item);
    const currentUser = this.getUser();
    let currentProfit = 0;
    if (currentUser) {
      currentProfit = currentUser.user_metadata['profit'] ?? 0;
    }
    const update = {
      id: user.id,
      profit: currentProfit + item.profit!,
      updated_at: new Date(),
    };
    const { data: updatedUser, error: updateError } = await this.supabase
      .from('profiles')
      .upsert(update)
      .select()
      .single();

    // TODO capire se aggiornare la ROI
    if (updatedUser) {
      const { data, error } = await this.supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          profit: updatedUser.profit,
          roi: updatedUser.profit / updatedUser.starting_bankroll,
        },
      });

      this.userSubject.next(data.user); // Aggiorna lo stato dell'utente
    }
    return;
  }
}
