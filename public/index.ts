import { router } from './router/router';
import { HomeView } from './views/viewHome';
import { ProfileView } from './views/viewProfile';
import { SettingsView } from './views/viewSettings';
import { SettingsAccountView } from './views/viewSettingsAccount';
import { SettingsNotificationsView } from './views/viewSettingsNotifications';
import { SettingsPrivacyView } from './views/viewSettingsPrivacy';
import { PostView } from './views/viewPost';
import { PostsView } from './views/viewPosts';
import { StatisticsView } from './views/viewStatistic';
import { SearchView } from './views/viewSearch';
import './index.scss'; 

interface Route {
    path: string;
    view: any;
    title?: string;
    requiresAuth?: boolean;
}

function registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(() => console.log('✅ Service Worker зарегистрирован'))
            .catch(err => console.log('❌ Ошибка регистрации Service Worker:', err));
    }
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

    router.addRoute('/search', SearchView, 'Mindleak - Поиск');

    router.init();
}

async function startApp(): Promise<void> {
    registerServiceWorker(); // Регистрируем SW
    await initApp(); // Запускаем приложение
}

startApp().catch(console.error);