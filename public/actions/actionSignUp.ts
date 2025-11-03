import { dispatcher } from '../dispatcher/dispatcher';

export const signUpActions = {

    signUpStart(): void {
        dispatcher.dispatch('SIGNUP_START');
    },

    signUpSuccess(): void {
        dispatcher.dispatch('SIGNUP_SUCCESS');
    },

    signUpFail(payload: { 
        error?: string; 
        fieldErrors?: Array<{ field: string; message: string }> 
    }): void {
        dispatcher.dispatch('SIGNUP_FAIL', payload);
    },

    reset(): void {
        dispatcher.dispatch('SIGNUP_RESET');
    }
};