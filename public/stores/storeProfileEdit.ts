import { BaseStore } from './store';
import { SettingsAccountData } from './storeSettingsAccount';

export interface EditProfileState {
    isOpen: boolean;
    isLoading: boolean;
    error: string | null;
    formData: Partial<SettingsAccountData> & { password?: string };
}

class EditProfileStore extends BaseStore<EditProfileState> {
    constructor() {
        super({
            isOpen: false,
            isLoading: false,
            error: null,
            formData: {}
        });
    }

    protected registerActions(): void {
        this.registerAction('EDIT_PROFILE_OPEN', (payload: { initialData: any }) => {
            console.log('EDIT_PROFILE_OPEN - Received initial data:', payload.initialData);
            
            this.setState({
                isOpen: true,
                formData: { 
                    ...payload.initialData,
                    password: '' // Пароль всегда пустой при открытии
                },
                error: null
            });
            
            console.log('EDIT_PROFILE_OPEN - Updated formData:', this.state.formData);
        });

        this.registerAction('EDIT_PROFILE_CLOSE', () => {
            this.setState({
                isOpen: false,
                formData: {},
                error: null,
                isLoading: false
            });
        });

        this.registerAction('EDIT_PROFILE_UPDATE_REQUEST', () => {
            this.setState({
                isLoading: true,
                error: null
            });
        });

        this.registerAction('EDIT_PROFILE_UPDATE_SUCCESS', () => {
            this.setState({
                isOpen: false,
                isLoading: false,
                formData: {},
                error: null
            });
        });

        this.registerAction('EDIT_PROFILE_UPDATE_FAIL', (payload: { error: string }) => {
            this.setState({
                isLoading: false,
                error: payload.error
            });
        });

        this.registerAction('SETTINGS_ACCOUNT_LOAD_SUCCESS', (payload: { settings: SettingsAccountData }) => {
            console.log('SETTINGS_ACCOUNT_LOAD_SUCCESS - Received settings:', payload.settings);
            
            if (this.state.isOpen) {
                const currentPassword = this.state.formData.password || '';
                this.setState({
                    formData: { 
                        ...payload.settings,
                        password: currentPassword
                    }
                });
                console.log('SETTINGS_ACCOUNT_LOAD_SUCCESS - Updated formData:', this.state.formData);
            }
        });
    }
}

export const editProfileStore = new EditProfileStore();