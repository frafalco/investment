import { createSelector } from "@ngrx/store";
import { AppState } from "./app.state";
import { Strategy } from "../models/strategy.model";
import { SelectedStrategy } from "../models/selected-strategy.model";

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

export const selectStrategiesAddBet = createSelector(
    selectProfileState,
    (state) => state.profile?.strategies.filter(s => s.name !== 'Total') //TODO filtrare anche quelle chiuse
);

export const selectStrategyFromId = (strategyId: number) => createSelector(
    selectProfileState,
    (state) => state.profile?.strategies.find((strategy: Strategy) => strategy.id === strategyId)
);

export const selectStrategyAndNamesFromId = (strategyId: number) => createSelector(
    selectProfileState,
    (state) => {
        const totalStrategies: SelectedStrategy[] = state.profile?.strategies.map((strategy: Strategy) => ({id: strategy.id, name: strategy.name})) ?? [];
        const filteredStrategy: Strategy | undefined = state.profile?.strategies.find((strategy: Strategy) => strategy.id === strategyId);
        return {
            strategy: filteredStrategy,
            totalStrategies: totalStrategies,
            selectedStrategies: state.profile?.selected_strategies
        }
    }
);