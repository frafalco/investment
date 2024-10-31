import { createFeature, createReducer, on } from '@ngrx/store';
import { Profile } from "../models/profile.model";
import * as ProfileActions from './profile.actions';

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
  on(ProfileActions.updateBetSuccess, (state: ProfileState, { bet }) => {
    const profile = {
      ...state.profile!,
      strategies: state.profile!.strategies.map(strategy => {
        if(strategy.id === bet.strategy_id) {
          return {
            ...strategy,
            profit: strategy.profit + bet.profit!,
            bets: strategy.bets.map(b => b.id === bet.id ? bet : b)
          }
        }
        return strategy;
      })
    };
    return ({ loading: false, error: undefined, profile })
  }),
  on(ProfileActions.addStrategy, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.addStrategySuccess, (state: ProfileState, { strategy }) => {
    const profile = {
      ...state.profile!,
      strategies: [...state.profile?.strategies ?? [], {...strategy, bets: []}],
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
