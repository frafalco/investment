import { Injectable } from '@angular/core';
import {
  AuthChangeEvent,
  AuthSession,
  createClient,
  Session,
  SignInWithPasswordCredentials,
  SupabaseClient,
  User,
} from '@supabase/supabase-js'
import { environment } from '../../environments/environment'
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  private session: Session | null = null;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.restoreSession();
  }

  // Funzione per ripristinare la sessione all'avvio dell'app
  async restoreSession() {
    const { data } = await this.supabase.auth.getSession();
    if (data.session) {
      this.session = data.session;  // Mantieni la sessione
      this.userSubject.next(data.session.user);
    }
  }

  getSetup() {
    return this.supabase.from('Set up').select().single();
  }

  insertSetup(bankroll: String) {
    return this.supabase.from('Set up').insert({starting_bankroll: bankroll});
  }

  async submitForm(submitForm: any) {
    try {
      const { data, error } = await this.supabase
        .from('Results')
        .insert([submitForm]);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
    this.session = data.session;  // Mantieni la sessione
    this.userSubject.next(data.user);  // Aggiorna lo stato dell'utente
    return data;
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
    }

    await this.supabase.from('profiles').upsert(update);
    const { data, error } = await this.supabase.auth.updateUser({
      data: { ...user.user_metadata, username, starting_bankroll }
    })
    this.userSubject.next(data.user);  // Aggiorna lo stato dell'utente
    return {data, error};
  }
}
