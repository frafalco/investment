import { Strategy } from "./strategy.model";

export interface Profile {
    id: string;
    updated_at?: string;
    username?: string;
    email: string;
    strategies: Strategy[];
}