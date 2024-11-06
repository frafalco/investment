import { createSelector } from "@ngrx/store";
import { AppState } from "./app.state";
import { Strategy } from "../models/strategy.model";

export const selectProfileState = (state: AppState) => state.profile;

export const selectLoading = createSelector(
    selectProfileState,
    (state) => state.loading
);

export const selectUsername = createSelector(
    selectProfileState,
    (state) => state.profile?.username || state.profile?.email
);

export const selectProfile = createSelector(
    selectProfileState,
    (state) => state.profile
);

export const selectLogin = createSelector(
    selectProfileState,
    (state) => state
);

export const selectStrategies = createSelector(
    selectProfileState,
    (state) => state.profile?.strategies
);

export const selectStrategyFromId = (strategyId: number) => createSelector(
    selectProfileState,
    (state) => state.profile?.strategies.find((strategy: Strategy) => strategy.id === strategyId)
);