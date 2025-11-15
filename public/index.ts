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
import { StatisticsView } from './views/viewStatistic';

interface Route {
    path: string;
    view: any;
    title?: string;
    requiresAuth?: boolean;
}

async function initApp(): Promise<void> {


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
    router.addRoute('/appeals/statistics', StatisticsView, 'Статистика', true);
    

    router.init();
}

initApp().catch(console.error);