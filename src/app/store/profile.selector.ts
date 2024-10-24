import { createSelector } from "@ngrx/store";
import { AppState } from "./app.state";

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