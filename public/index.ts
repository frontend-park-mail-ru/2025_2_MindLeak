import { router } from './router/router';
import { HomeView } from './views/viewHome';
import { ProfileView } from './views/viewProfile';
import { SettingsView } from './views/viewSettings';
import { SettingsAccountView } from './views/viewSettingsAccount';
import { SettingsNotificationsView } from './views/viewSettingsNotifications';
import { SettingsPrivacyView } from './views/viewSettingsPrivacy';
import { PostView } from './views/viewPost';
import { PostsView } from './views/viewPosts';
import { dispatcher } from './dispatcher/dispatcher';

interface Route {
    path: string;
    view: any;
    title?: string;
    requiresAuth?: boolean;
}

async function initApp(): Promise<void> {

    dispatcher.dispatch('LOGIN_CHECK_REQUEST');

    // Общедоступные маршруты
    router.addRoute('/', HomeView, 'Mindleak - Главная');
    router.addRoute('/feed', HomeView, 'Mindleak - Лента');
    router.addRoute('/feed/category', HomeView, 'Mindleak - Категория');
    router.addRoute('/feed/category', PostsView, 'Категория');
    router.addRoute('/post/:id', PostView, 'Mindleak - Пост');

    // Защищенные маршруты (требуют авторизации)
    router.addRoute('/profile', ProfileView, 'Mindleak - Мой профиль', true);
    router.addRoute('/profile/:id', ProfileView, 'Mindleak - Профиль', true);
    
    // Настройки (все защищенные)
    router.addRoute('/settings', SettingsView, 'Mindleak - Настройки', true);
    router.addRoute('/settings/account', SettingsAccountView, 'Mindleak - Учетная запись', true);
    router.addRoute('/settings/notifications', SettingsNotificationsView, 'Mindleak - Уведомления', true);
    router.addRoute('/settings/privacy', SettingsPrivacyView, 'Mindleak - Конфиденциальность', true);

    router.init();
    console.log('App initialized with routing');
}

initApp().catch(console.error);