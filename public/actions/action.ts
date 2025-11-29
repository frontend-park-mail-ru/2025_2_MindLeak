// src/actions/action.ts
export type ActionType = string;

export interface Action {
    type: ActionType;
    data: any;
}
