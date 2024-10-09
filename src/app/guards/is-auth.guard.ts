import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { AuthSession } from '@supabase/supabase-js';
import { map } from 'rxjs';

export const isAuthGuard: CanActivateFn = async (route, state) => {
  const router: Router = inject(Router);
  const supabase: SupabaseService = inject(SupabaseService);
  await supabase.restoreSession();  // Assicura che la sessione sia caricata
  const user = supabase.getUser();
  if (user) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
  // const session: AuthSession | null = inject(SupabaseService).session;
  // const isAuth: boolean = session != null;
  // return isAuth || router.navigate(['login']);
  // return inject(SupabaseService).user$.pipe(
  //   map(user => {
  //     if (user) {
  //       return true;
  //     } else {
  //       router.navigate(['/login']);
  //       return false;
  //     }
  //   })
  // );
};
