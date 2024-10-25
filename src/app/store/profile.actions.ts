import { createAction, props } from '@ngrx/store';
import { Profile } from '../models/profile.model';
import { Bet } from '../models/bet.model';
import { Strategy } from '../models/strategy.model';

export const loadProfile = createAction('[Profile] Load Profile');
export const loadProfileSuccess = createAction('[Profile] Load Profile Success', props<{ profile: Profile }>());

export const logout = createAction('[Profile] Logout');
export const logoutSuccess = createAction('[Profile] Logout Success');

export const login = createAction('[Profile] Login', props<{ username: string, password:string }>());
export const loginSuccess = createAction('[Profile] Login Success');

export const updateProfile = createAction('[Profile] Update Profile');
export const updateProfileSuccess = createAction('[Profile] Update Profile Success', props<{ profile: Profile }>());

export const updateBet = createAction('[Profile] Update Bet', props<{ bet: Bet, strategy: Strategy }>());
export const updateBetSuccess = createAction('[Profile] Update Bet Success', props<{ bet: Bet }>());

export const addStrategy = createAction('[Profile] Add Strategy', props<{ name: string | null, starting_bankroll: number | null, str_type: string | null }>());
export const addStrategySuccess = createAction('[Profile] Add Strategy Success', props<{ strategy: Strategy }>());

export const addBet = createAction('[Profile] Add Bet', props<{ bet: Bet }>());
export const addBetSuccess = createAction('[Profile] Add Bet Success', props<{ bet: Bet }>());

export const deleteBet = createAction('[Profile] Delete Bet', props<{ bet: Bet, strategy: Strategy }>());
export const deleteBetSuccess = createAction('[Profile] Delete Bet Success', props<{ bet: Bet }>());

export const actionFailure = createAction('[Profile] Action Failure', props<{ error: string }>());