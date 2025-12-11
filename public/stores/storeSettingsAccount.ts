import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';
import { loginStore } from './storeLogin';

export interface SettingsAccountData {
    phone: string;
    country: string;
    language: string;
    sex: 'male' | 'female' | 'other';
    date_of_birth: string;
    cover_url: string;
    name: string;
    avatar_url: string;
    email: string;
    created_at: string;
    age?: number;
}

export interface SettingsAccountState {
    settings: SettingsAccountData | null;
    isLoading: boolean;
    error: string | null;
    isUpdating: boolean;
    isUploadingAvatar: boolean;
    isUploadingCover: boolean;
}

class SettingsAccountStore extends BaseStore<SettingsAccountState> {
    constructor() {
        super({
            settings: null,
            isLoading: false,
            error: null,
            isUpdating: false,
            isUploadingAvatar: false,
            isUploadingCover: false
        });
    }

    protected registerActions(): void {
        this.registerAction('SETTINGS_ACCOUNT_LOAD_REQUEST', () => {
            this.setState({
                isLoading: true,
                error: null
            });
        });

        this.registerAction('SETTINGS_ACCOUNT_LOAD_SUCCESS', (payload: { settings: SettingsAccountData }) => {
            const settingsWithAge = {
                ...payload.settings,
                age: this.calculateAge(payload.settings.date_of_birth)
            };

            this.setState({
                settings: settingsWithAge,
                isLoading: false,
                error: null,
                isUploadingAvatar: false,
                isUploadingCover: false
            });
        });

        this.registerAction('SETTINGS_ACCOUNT_LOAD_FAIL', (payload: { error: string }) => {
            this.setState({
                isLoading: false,
                error: payload.error
            });
        });

        this.registerAction('SETTINGS_ACCOUNT_UPDATE_REQUEST', () => {
            this.setState({
                isUpdating: true,
                error: null
            });
        });

        this.registerAction('SETTINGS_ACCOUNT_UPDATE_SUCCESS', () => {
            this.setState({
                isUpdating: false,
                error: null
            });
        });

        this.registerAction('SETTINGS_ACCOUNT_UPDATE_FAIL', (payload: { error: string }) => {
            this.setState({
                isUpdating: false,
                error: payload.error
            });
        });

        this.registerAction('AVATAR_UPLOAD_REQUEST', () => {
            this.setState({
                isUploadingAvatar: true,
                error: null
            });
        });

        //первое изменение ФФФФФФФФФФФФФФФ ФФФФФФФФФФФФФ
        this.registerAction('AVATAR_UPLOAD_SUCCESS', (payload: { avatar_url: string }) => {
            console.log('✅ AVATAR_UPLOAD_SUCCESS in store:', payload);

            const currentSettings = this.state.settings;
            if (currentSettings) {
                // ИЗМЕНЕНИЕ: Используем URL с timestamp для обновления кэша
                const cacheBustedUrl = `${payload.avatar_url}${payload.avatar_url.includes('?') ? '&' : '?'}_=${Date.now()}`;
                
                this.setState({
                    isUploadingAvatar: false,
                    error: null,
                    settings: {
                        ...currentSettings,
                        avatar_url: cacheBustedUrl
                    }
                });
                
                // Сразу отправляем обновление во все stores
                const loginState = loginStore.getState();
                if (loginState.user) {
                    // Отправляем в loginStore
                    dispatcher.dispatch('USER_UPDATE_PROFILE', {
                        user: {
                            ...loginState.user,
                            avatar: cacheBustedUrl
                        }
                    });
                    
                    // ДОБАВЛЯЕМ: Перезагружаем профиль
                    console.log('🔄 Dispatching profile reload after avatar update');
                    dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                        userId: loginState.user.id 
                    });
                }
            }
        });

        this.registerAction('AVATAR_UPLOAD_FAIL', (payload: { error: string }) => {
            this.setState({
                isUploadingAvatar: false,
                error: payload.error
            });
        });

        this.registerAction('AVATAR_DELETE_REQUEST', () => {
            this.setState({
                isUploadingAvatar: true,
                error: null
            });
        });

        this.registerAction('AVATAR_DELETE_SUCCESS', () => {
            const currentSettings = this.state.settings;
            this.setState({
                isUploadingAvatar: false,
                error: null,
                settings: currentSettings ? { ...currentSettings, avatar_url: '' } : null
            });
        });

        this.registerAction('AVATAR_DELETE_FAIL', (payload: { error: string }) => {
            this.setState({
                isUploadingAvatar: false,
                error: payload.error
            });
        });

        this.registerAction('COVER_UPLOAD_REQUEST', () => {
            this.setState({
                isUploadingCover: true,
                error: null
            });
        });

        this.registerAction('COVER_UPLOAD_SUCCESS', (payload: { cover_url: string }) => {
            const currentSettings = this.state.settings;
            this.setState({
                isUploadingCover: false,
                error: null,
                settings: currentSettings ? { ...currentSettings, cover_url: payload.cover_url } : null
            });
        });

        this.registerAction('COVER_UPLOAD_FAIL', (payload: { error: string }) => {
            this.setState({
                isUploadingCover: false,
                error: payload.error
            });
        });

        this.registerAction('COVER_DELETE_REQUEST', () => {
            this.setState({
                isUploadingCover: true,
                error: null
            });
        });

        this.registerAction('COVER_DELETE_SUCCESS', () => {
            const currentSettings = this.state.settings;
            this.setState({
                isUploadingCover: false,
                error: null,
                settings: currentSettings ? { ...currentSettings, cover_url: '' } : null
            });
        });

        this.registerAction('COVER_DELETE_FAIL', (payload: { error: string }) => {
            this.setState({
                isUploadingCover: false,
                error: payload.error
            });
        });
    }

    private calculateAge(dateOfBirth: string): number | undefined {
        if (!dateOfBirth) return undefined;
        
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }
}

export const settingsAccountStore = new SettingsAccountStore();
