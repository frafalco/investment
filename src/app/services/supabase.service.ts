import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient,
} from '@supabase/supabase-js'
import { environment } from '../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  getSetup() {
    return this.supabase.from('Set up').select();
  }

  insertSetup(bankroll: String) {
    return this.supabase.from('Set up').insert({starting_bankroll: bankroll});
  }
}
