import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as ProfileActions from './profile.actions';
import { catchError, map, mergeMap, of, switchMap } from 'rxjs';
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
      switchMap(({bet, strategy, previousProfit}) =>
        supabase.updateBetAndStrategy(bet, strategy, previousProfit).pipe(
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

export const addStrategy = createEffect(
  (actions$ = inject(Actions), supabase = inject(SupabaseService)) => {
    return actions$.pipe(
      ofType(ProfileActions.addStrategy),
      switchMap(({name, starting_bankroll, str_type}) =>
        supabase.addStrategy(name, starting_bankroll, str_type).pipe(
          map((strategy) => ProfileActions.addStrategySuccess({strategy})),
          catchError((error) =>
            of(ProfileActions.actionFailure({ error: error.message }))
          )
        )
      )
    );
  },
  { functional: true }
);

export const addBet = createEffect(
  (actions$ = inject(Actions), supabase = inject(SupabaseService)) => {
    return actions$.pipe(
      ofType(ProfileActions.addBet),
      mergeMap(({ bet }) =>
        supabase.insertBet(bet).pipe(
          map((newBet) => ProfileActions.addBetSuccess({bet: newBet})),
          catchError((error) =>
            of(ProfileActions.actionFailure({ error: error.message }))
          )
        )
      )
    );
  },
  { functional: true }
);

export const deleteBet = createEffect(
  (actions$ = inject(Actions), supabase = inject(SupabaseService)) => {
    return actions$.pipe(
      ofType(ProfileActions.deleteBet),
      switchMap(({ bet, strategy }) =>
        supabase.deleteBet(bet, strategy).pipe(
          map((oldBet) => ProfileActions.deleteBetSuccess({bet: oldBet})),
          catchError((error) =>
            of(ProfileActions.actionFailure({ error: error.message }))
          )
        )
      )
    );
  },
  { functional: true }
);