import { SelectedStrategy } from "./selected-strategy.model";
import { Strategy } from "./strategy.model";

export interface Profile {
    id: string;
    updated_at?: string;
    username?: string;
    email: string;
    selected_strategies?: SelectedStrategy[];
    strategies: Strategy[];
}