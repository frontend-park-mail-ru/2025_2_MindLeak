import { BaseStore } from './store';

export interface SignUpState {
    isLoading: boolean;
    error: string | null;
    fieldErrors: Array<{ field: string; message: string }>;
    isSuccess: boolean;
}

class SignUpStore extends BaseStore<SignUpState> {
    constructor() {
        super({
            isLoading: false,
            error: null,
            fieldErrors: [],
            isSuccess: false
        });
    }

    protected registerActions(): void {
        this.registerAction('SIGNUP_REQUEST', () => {
            this.setState({
                isLoading: true,
                error: null,
                fieldErrors: [],
                isSuccess: false
            });
        });

        this.registerAction('USER_SIGNUP_SUCCESS', () => {
            this.setState({
                isLoading: false,
                error: null,
                fieldErrors: [],
                isSuccess: true
            });
        });

        this.registerAction('USER_SIGNUP_FAIL', (payload: { 
            error?: string; 
            fieldErrors?: Array<{ field: string; message: string }> 
        }) => {
            this.setState({
                isLoading: false,
                error: payload.error || null,
                fieldErrors: payload.fieldErrors || [],
                isSuccess: false
            });
        });

        this.registerAction('SIGNUP_RESET', () => {
            this.setState({
                isLoading: false,
                error: null,
                fieldErrors: [],
                isSuccess: false
            });
        });
    }
}

export const signUpStore = new SignUpStore();