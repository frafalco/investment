import { createFeature, createReducer, on } from '@ngrx/store';
import { Profile } from "../models/profile.model";
import * as ProfileActions from './profile.actions';
import { Strategy } from '../models/strategy.model';

export interface ProfileState {
  profile?: Profile;
  loading: boolean;
  error?: string;
}
export const initialState: ProfileState = {
  profile: undefined,
  loading: true,
  error: undefined,
};
export const profileReducer = createReducer(
  initialState,
  on(ProfileActions.loadProfile, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.loadProfileSuccess, (state: ProfileState, { profile }) => ({
    ...state,
    profile: {
      ...profile,
      strategies: [...profile.strategies].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).map((strategy) => {
        const newStrategy = {
          ...strategy,
          total_wagered: [...strategy.bets].reduce((total, bet) => total += bet.bet, 0)
        }
        return newStrategy;
      })
    },
    loading: false,
  })),
  on(ProfileActions.updateProfile, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.updateProfileSuccess, (state: ProfileState, { profile }) => ({
    ...state,
    profile,
    loading: false,
  })),
  on(ProfileActions.logout, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.logoutSuccess, (state: ProfileState) => ({
    ...state,
    profile: undefined,
    loading: false,
  })),
  on(ProfileActions.login, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.updateBet, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.updateBetSuccess, (state: ProfileState, { bet, profit }) => {
    const profile = {
      ...state.profile!,
      strategies: state.profile!.strategies.map(strategy => {
        if(strategy.id === bet.strategy_id) {
          return {
            ...strategy,
            profit: profit,
            bets: strategy.bets.map(b => b.id === bet.id ? bet : b)
          }
        }
        return strategy;
      })
    };
    return ({ loading: false, error: undefined, profile })
  }),
  on(ProfileActions.upsertStrategy, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.upsertStrategySuccess, (state: ProfileState, { strategy }) => {
    const currentStrategies = state.profile?.strategies;
    let strategies: Strategy[] = [];
    let alreadyExistingStrategy: boolean = false;
    if(currentStrategies && currentStrategies.length > 0) {
      strategies = currentStrategies.map((s) => {
        if (s.id === strategy.id) {
          alreadyExistingStrategy = true;
          return {
            ...strategy,
            bets: [...s.bets]
          }
        }
        return s;
      });
    }
    if(!alreadyExistingStrategy) {
      strategies.push({...strategy, bets: []});
    }
    strategies = strategies.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    const profile = {
      ...state.profile!,
      strategies,
    };
    return ({ loading: false, error: undefined, profile })
  }),
  on(ProfileActions.addBet, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.addBetSuccess, (state: ProfileState, { bet }) => {
    const profile = {
      ...state.profile!,
      strategies: state.profile!.strategies.map(strategy => {
        if(strategy.id === bet.strategy_id) {
          return {
            ...strategy,
            bets: [...strategy.bets, bet]
          }
        }
        return strategy;
      })
    };
    return ({ loading: false, error: undefined, profile })
  }),
  on(ProfileActions.deleteStrategy, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.deleteStrategySuccess, (state: ProfileState, { strategy }) => {
    const profile = {
      ...state.profile!,
      strategies: state.profile!.strategies.filter(s => s.id !== strategy.id)
    };
    return ({ loading: false, error: undefined, profile })
  }),
  on(ProfileActions.deleteBet, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.deleteBetSuccess, (state: ProfileState, { bet }) => {
    const profile = {
      ...state.profile!,
      strategies: state.profile!.strategies.map(strategy => {
        if(strategy.id === bet.strategy_id) {
          return {
            ...strategy,
            profit: strategy.profit - bet.profit!,
            bets: strategy.bets.filter(b => b.id !== bet.id)
          }
        }
        return strategy;
      })
    };
    return ({ loading: false, error: undefined, profile })
  }),
  on(ProfileActions.actionFailure, (state: ProfileState, { error }) => ({
    ...state,
    error,
    loading: false,
  }))
);
