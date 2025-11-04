import { BaseStore } from './store';

export interface SettingsMainState {
    activeTab: 'account' | 'notifications' | 'privacy';
}

class SettingsMainStore extends BaseStore<SettingsMainState> {
    constructor() {
        super({
            activeTab: 'account'
        });
    }

    protected registerActions(): void {
        this.registerAction('SETTINGS_CHANGE_TAB', (payload: { tab: 'account' | 'notifications' | 'privacy' }) => {
            this.setState({
                activeTab: payload.tab
            });
        });
    }
}

export const settingsMainStore = new SettingsMainStore();