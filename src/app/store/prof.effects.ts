import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as ProfileActions from './profile.actions';
import { catchError, map, of, switchMap } from 'rxjs';
import { SupabaseService } from '../services/supabase.service';

export const loadProfile = createEffect(
  (actions$ = inject(Actions), supabase = inject(SupabaseService)) => {
    return actions$.pipe(
      ofType(ProfileActions.loadProfile),
      switchMap(() =>
        supabase.getProfile().pipe(
          map((profile) => ProfileActions.loadProfileSuccess({ profile })),
          catchError((error) =>
            of(ProfileActions.actionFailure({ error: error.message }))
          )
        )
      )
    );
  },
  { functional: true }
);

export const logout = createEffect(
  (actions$ = inject(Actions), supabase = inject(SupabaseService)) => {
    return actions$.pipe(
      ofType(ProfileActions.logout),
      switchMap(() =>
        supabase.signOut().pipe(
          map(() => ProfileActions.logoutSuccess()),
          catchError((error) =>
            of(ProfileActions.actionFailure({ error: error.message }))
          )
        )
      )
    );
  },
  { functional: true }
);

export const login = createEffect(
  (actions$ = inject(Actions), supabase = inject(SupabaseService)) => {
    return actions$.pipe(
      ofType(ProfileActions.login),
      switchMap(({username, password}) =>
        supabase.signIn(username, password).pipe(
          map(() => ProfileActions.loadProfile()),
          catchError((error) =>
            of(ProfileActions.actionFailure({ error: error.message }))
          )
        )
      )
    );
  },
  { functional: true }
);

export const updateBet = createEffect(
  (actions$ = inject(Actions), supabase = inject(SupabaseService)) => {
    return actions$.pipe(
      ofType(ProfileActions.updateBet),
      switchMap(({bet, strategy}) =>
        supabase.updateBetAndStrategy(bet, strategy).pipe(
          map((bet) => ProfileActions.updateBetSuccess({bet})),
          catchError((error) =>
            of(ProfileActions.actionFailure({ error: error.message }))
          )
        )
      )
    );
  },
  { functional: true }
);