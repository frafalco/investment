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
  // private supabaseClient: SupabaseClient | undefined;
  // constructor() {}

  // get supabase(): SupabaseClient {
  //   console.log('Sono qui');
  //   console.log(this.supabaseClient);
  //   if(!this.supabaseClient) {
  //     console.log('Entro qui');
  //     this.supabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);
  //     console.log(this.supabaseClient);
  //   }
  //   return this.supabaseClient;
  // }
  private supabase: SupabaseClient;
  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  getSetup() {
    // const sc = this.supabase;
    // console.log(sc.from('Set up').select());
    // return sc.from('Set up').select().single();
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
}
