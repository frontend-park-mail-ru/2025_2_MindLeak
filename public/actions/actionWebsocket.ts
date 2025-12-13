import { Action, ActionType } from './action';

export const ACTION_WS_TYPES = {
	WSClosed: 'ActionWSClosed',
};

export class ActionWSClosed implements Action {
	type: ActionType = ACTION_WS_TYPES.WSClosed;
	data: object = {};
}