import { dispatcher } from '../dispatcher/dispatcher';
import { User } from '../stores/storeLogin';

export const loginActions = {

    loginStart(): void {
        dispatcher.dispatch('USER_LOGIN_START');
    },

    loginSuccess(user: User): void {
        dispatcher.dispatch('USER_LOGIN_SUCCESS', { user });
    },

    loginFail(error: string): void {
        dispatcher.dispatch('USER_LOGIN_FAIL', { error });
    },

    logout(): void {
        dispatcher.dispatch('USER_LOGOUT');
    },

    loginChecked(user: User | null): void {
        dispatcher.dispatch('USER_LOGIN_CHECKED', { user });
    },

    avatarUploaded(avatar: string): void {
        dispatcher.dispatch('AVATAR_UPLOADED', { avatar });
    },

    updateUser(user: Partial<User>): void {
        dispatcher.dispatch('USER_UPDATE_PROFILE', { user });
    },
    
    avatarUpdated(avatar: string): void {
        dispatcher.dispatch('UPDATE_AVATAR_ONLY', { avatar });
    }
};
