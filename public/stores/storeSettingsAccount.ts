import { BaseStore } from './store';

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
                error: null
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

        this.registerAction('AVATAR_UPLOAD_SUCCESS', () => {
            this.setState({
                isUploadingAvatar: false,
                error: null
            });
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
            this.setState({
                isUploadingAvatar: false,
                error: null
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

        this.registerAction('COVER_UPLOAD_SUCCESS', () => {
            this.setState({
                isUploadingCover: false,
                error: null
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
            this.setState({
                isUploadingCover: false,
                error: null
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