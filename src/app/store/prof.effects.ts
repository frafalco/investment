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

export const updateProfile = createEffect(
  (actions$ = inject(Actions), supabase = inject(SupabaseService)) => {
    return actions$.pipe(
      ofType(ProfileActions.updateProfile),
      switchMap(({ username }) =>
        supabase.updateProfile(username).pipe(
          map((profile) => ProfileActions.updateProfileSuccess({ profile })),
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
      switchMap(({bet, previousProfit}) =>
        supabase.updateBetAndStrategy(bet, previousProfit).pipe(
          map((data) => ProfileActions.updateBetSuccess(data)),
          catchError((error) =>
            of(ProfileActions.actionFailure({ error: error.message }))
          )
        )
      )
    );
  },
  { functional: true }
);

export const upsertStrategy = createEffect(
  (actions$ = inject(Actions), supabase = inject(SupabaseService)) => {
    return actions$.pipe(
      ofType(ProfileActions.upsertStrategy),
      switchMap(({id, name, starting_bankroll, str_type}) =>
        supabase.upsertStrategy(id, name, starting_bankroll, str_type).pipe(
          map((strategy) => ProfileActions.upsertStrategySuccess({strategy})),
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

export const deleteStrategy = createEffect(
  (actions$ = inject(Actions), supabase = inject(SupabaseService)) => {
    return actions$.pipe(
      ofType(ProfileActions.deleteStrategy),
      switchMap(({ strategy_id }) =>
        supabase.deleteStrategy(strategy_id).pipe(
          map((oldStrategy) => ProfileActions.deleteStrategySuccess({strategy: oldStrategy})),
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
      switchMap(({ bet }) =>
        supabase.deleteBet(bet).pipe(
          map(({bet, profit}) => ProfileActions.deleteBetSuccess({bet, profit})),
          catchError((error) =>
            of(ProfileActions.actionFailure({ error: error.message }))
          )
        )
      )
    );
  },
  { functional: true }
);

export const updateSelectedStrategies = createEffect(
  (actions$ = inject(Actions), supabase = inject(SupabaseService)) => {
    return actions$.pipe(
      ofType(ProfileActions.updateSelectedStrategy),
      switchMap(({strategies_selected}) =>
        supabase.updateSelectedStrategies(strategies_selected).pipe(
          map((profile) => ProfileActions.updateSelectedStrategySuccess({profile})),
          catchError((error) =>
            of(ProfileActions.actionFailure({ error: error.message }))
          )
        )
      )
    );
  },
  { functional: true }
);