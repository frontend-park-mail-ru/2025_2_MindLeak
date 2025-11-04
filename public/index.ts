import { router } from './router/router';
import { HomeView } from './views/viewHome';
import { ProfileView } from './views/viewProfile';
import { SettingsView } from './views/viewSettings';
import { SettingsAccountView } from './views/viewSettingsAccount';
import { SettingsNotificationsView } from './views/viewSettingsNotifications';
import { SettingsPrivacyView } from './views/viewSettingsPrivacy';

async function initApp(): Promise<void> {
    router.addRoute('/', HomeView, 'Mindleak - Главная');
    router.addRoute('/profile', ProfileView, 'Mindleak - Мой профиль'); // свой профиль
    router.addRoute('/user', ProfileView, 'Mindleak - Профиль'); // чужой профиль с query параметром

    // Настройки
    router.addRoute('/settings', SettingsView, 'Mindleak - Настройки');
    router.addRoute('/settings/account', SettingsAccountView, 'Mindleak - Учетная запись');
    router.addRoute('/settings/notifications', SettingsNotificationsView, 'Mindleak - Уведомления');
    router.addRoute('/settings/privacy', SettingsPrivacyView, 'Mindleak - Конфиденциальность');

    router.init();
    console.log('App initialized with routing');
}

initApp().catch(console.error);