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

        this.registerAction('AVATAR_UPLOAD_SUCCESS', () => {  // БЕЗ payload!
            console.log('✅ AVATAR_UPLOAD_SUCCESS in store');
            
            const currentSettings = this.state.settings;
            // ✅ ОБНОВЛЯЕМ аватар в настройках тоже!
            const authState = loginStore.getState();
            const updatedSettings = currentSettings ? {
                ...currentSettings,
                avatar_url: authState.user?.avatar || currentSettings.avatar_url
            } : currentSettings;
            
            this.setState({
                isUploadingAvatar: false,
                error: null,
                settings: updatedSettings
            });
            
            // ✅ Триггерим обновление Header
            dispatcher.dispatch('HEADER_FORCE_REFRESH');
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

        //нужно ли это изменение todo ПРОВЕРИТЬ ФФФФФФФФФФФФФФ
        this.registerAction('COVER_UPLOAD_SUCCESS', () => {  // БЕЗ payload!
            console.log('✅ COVER_UPLOAD_SUCCESS in store');
            
            const currentSettings = this.state.settings;
            // Просто обновляем флаги
            this.setState({
                isUploadingCover: false,
                error: null,
                settings: currentSettings
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
        
        // Проверяем, не является ли это специальной датой 01.01.0001
        if (birthDate.getFullYear() === 1 && 
            birthDate.getMonth() === 0 && 
            birthDate.getDate() === 1) {
            return undefined; // Возраст не рассчитывается для специальной даты
        }
        
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
