import { createFeature, createReducer, on } from '@ngrx/store';
import { Profile } from "../models/profile.model";
import * as ProfileActions from './profile.actions';
import { Strategy } from '../models/strategy.model';
import { SelectedStrategy } from '../models/selected-strategy.model';

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
  on(ProfileActions.loadProfileSuccess, (state: ProfileState, { profile }) => {
    const {profileStrategies, strategies} = updateProfileFunction(profile);
    return {
      ...state,
      profile: {
        ...profile,
        strategies: [...profileStrategies, ...strategies]
      },
      loading: false,
    }
  }),
  on(ProfileActions.updateProfile, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.updateProfileSuccess, (state: ProfileState, { profile }) => {
    const {profileStrategies, strategies} = updateProfileFunction(profile);
    return {
      ...state,
      profile: {
        ...profile,
        strategies: [...profileStrategies, ...strategies]
      },
      loading: false,
    }
  }),
  on(ProfileActions.logout, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.logoutSuccess, (state: ProfileState) => ({
    ...state,
    profile: undefined,
    loading: false,
  })),
  on(ProfileActions.login, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.updateBet, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.updateBetSuccess, (state: ProfileState, { bet, profit }) => {
    const strategies = state.profile!.strategies.map(strategy => {
      if(strategy.id === bet.strategy_id) {
        return {
          ...strategy,
          profit: profit,
          bets: strategy.bets.map(b => b.id === bet.id ? bet : b)
        }
      }
      return strategy;
    });
    const totalStrategy = getTotalStrategy(state.profile!, strategies);
    const profile = {
      ...state.profile!,
      strategies: strategies.map(s => s.id === 0 ? totalStrategy : s)
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
            total_wagered: [...s.bets].reduce((total, bet) => total += bet.bet, 0),
            bets: [...s.bets]
          }
        }
        return s;
      });
    }
    if(!alreadyExistingStrategy) {
      strategies.push({...strategy, bets: []});
    }
    strategies = strategies.filter(s => s.id !== 0).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    const totalStrategy = getTotalStrategy(state.profile!, strategies);
    const profile = {
      ...state.profile!,
      strategies: [totalStrategy, ...strategies],
    };
    return ({ loading: false, error: undefined, profile })
  }),
  on(ProfileActions.addBet, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.addBetSuccess, (state: ProfileState, { bet }) => {
    const strategies = (state.profile?.strategies.filter(s => s.id !== 0) ?? []).map(strategy => {
      if(strategy.id === bet.strategy_id || strategy.id === 0) {
        return {
          ...strategy,
          total_wagered: [...strategy.bets, bet].reduce((total, bet) => total += bet.bet, 0),
          bets: [...strategy.bets, bet]
        }
      }
      return strategy;
    });
    const totalStrategy = getTotalStrategy(state.profile!, strategies);
    const profile = {
      ...state.profile!,
      strategies: [totalStrategy, ...strategies]
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
  on(ProfileActions.deleteBetSuccess, (state: ProfileState, { bet, profit }) => {
    const strategies = (state.profile?.strategies.filter(s => s.id !== 0) ?? []).map(strategy => {
      if(strategy.id === bet.strategy_id || strategy.id === 0) {
        return {
          ...strategy,
          profit,
          total_wagered: strategy.bets.filter(b => b.id !== bet.id).reduce((total, bet) => total += bet.bet, 0),
          bets: strategy.bets.filter(b => b.id !== bet.id)
        }
      }
      return strategy;
    });
    const totalStrategy = getTotalStrategy(state.profile!, strategies);
    const profile = {
      ...state.profile!,
      strategies: [totalStrategy, ...strategies]
    };
    return ({ loading: false, error: undefined, profile })
  }),
  on(ProfileActions.updateSelectedStrategy, (state: ProfileState) => ({ ...state, loading: true, error: undefined })),
  on(ProfileActions.updateSelectedStrategySuccess, (state: ProfileState, {profile}) => {
    const {profileStrategies, strategies} = updateProfileFunction(profile);
    return {
      ...state,
      profile: {
        ...profile,
        strategies: [...profileStrategies, ...strategies]
      },
      loading: false,
    }
  }),
  on(ProfileActions.actionFailure, (state: ProfileState, { error }) => ({
    ...state,
    error,
    loading: false,
  })),
  on(ProfileActions.addLoader, (state: ProfileState) => ({ ...state, loading: true })),
  on(ProfileActions.removeLoader, (state: ProfileState) => ({ ...state, loading: false })),
);

const updateProfileFunction = (profile: Profile): {profileStrategies: Strategy[], strategies: Strategy[]} => {
  const strategies: Strategy[] = [...profile.strategies].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).map((strategy) => {
    const newStrategy = {
      ...strategy,
      total_wagered: [...strategy.bets].reduce((total, bet) => total += bet.bet, 0)
    }
    return newStrategy;
  });
  const totalStrategy = getTotalStrategy(profile, strategies);
  const profileStrategies: Strategy[] = [];
  if(strategies.length > 0) {
    profileStrategies.push(totalStrategy);
  }
  return {
    profileStrategies,
    strategies
  }
}

const getTotalStrategy = (profile: Profile, strategies: Strategy[]): Strategy => {
  const totalStrategy: Strategy = {
    id: 0,
    name: 'Total',
    type: 'total',
    starting_bankroll: 0,
    profit: 0,
    user_id: profile.id,
    bets: [],
    total_wagered: 0
  }
  const selectedStrategiesIds = profile.selected_strategies?.map(s => s.id);
  strategies.forEach(s => {
    if(selectedStrategiesIds?.includes(s.id)) {
      totalStrategy.starting_bankroll += s.starting_bankroll;
      totalStrategy.profit += s.profit;
      totalStrategy.total_wagered += s.total_wagered;
      totalStrategy.bets = [...totalStrategy.bets, ...s.bets]
    }
  })
  return totalStrategy;
}