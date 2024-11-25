import { createAction, props } from '@ngrx/store';
import { Profile } from '../models/profile.model';
import { Bet } from '../models/bet.model';
import { Strategy } from '../models/strategy.model';
import { SelectedStrategy } from '../models/selected-strategy.model';

export const loadProfile = createAction('[Profile] Load Profile');
export const loadProfileSuccess = createAction('[Profile] Load Profile Success', props<{ profile: Profile }>());

export const logout = createAction('[Profile] Logout');
export const logoutSuccess = createAction('[Profile] Logout Success');

export const login = createAction('[Profile] Login', props<{ username: string, password:string }>());
export const loginSuccess = createAction('[Profile] Login Success');

export const updateProfile = createAction('[Profile] Update Profile', props<{ username: string }>());
export const updateProfileSuccess = createAction('[Profile] Update Profile Success', props<{ profile: Profile }>());

export const updateBet = createAction('[Profile] Update Bet', props<{ bet: Bet, previousProfit: number }>());
export const updateBetSuccess = createAction('[Profile] Update Bet Success', props<{ bet: Bet, profit: number }>());

export const upsertStrategy = createAction('[Profile] Add Strategy', props<{ id: number | null, name: string | null, starting_bankroll: number | null, str_type: string | null }>());
export const upsertStrategySuccess = createAction('[Profile] Add Strategy Success', props<{ strategy: Strategy }>());

export const addBet = createAction('[Profile] Add Bet', props<{ bet: Bet }>());
export const addBetSuccess = createAction('[Profile] Add Bet Success', props<{ bet: Bet }>());

export const deleteStrategy = createAction('[Profile] Delete Strategy', props<{ strategy_id: number }>());
export const deleteStrategySuccess = createAction('[Profile] Delete Strategy Success', props<{ strategy: Strategy }>());

export const deleteBet = createAction('[Profile] Delete Bet', props<{ bet: Bet }>());
export const deleteBetSuccess = createAction('[Profile] Delete Bet Success', props<{ bet: Bet, profit: number }>());

export const updateSelectedStrategy = createAction('[Profile] Update Selected Strategies', props<{ strategies_selected: SelectedStrategy[] | null }>());
export const updateSelectedStrategySuccess = createAction('[Profile] Update Selected Strategies Success', props<{ profile: Profile }>());

export const actionFailure = createAction('[Profile] Action Failure', props<{ error: string }>());

export const addLoader = createAction('[Profile] Add Loader');
export const removeLoader = createAction('[Profile] Remove Loader');