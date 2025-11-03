import { router } from './router/router';
//import { LoginFormView } from './views/viewLogin.js';
//import { SignUpFormView } from './views/viewSignUp.js';
import { HomeView } from './views/viewHome';
import { ProfileView } from './views/viewProfile';

async function initApp(): Promise<void> {
    router.addRoute('/', HomeView, 'Mindleak - Главная');
    //router.addRoute('/login', LoginFormView, 'Mindleak - Вход');
    //router.addRoute('/register', SignUpFormView, 'Mindleak - Регистрация');
    router.addRoute('/profile', ProfileView, 'Mindleak - Мой профиль'); // свой профиль
    router.addRoute('/user', ProfileView, 'Mindleak - Профиль'); // чужой профиль с query параметром

    router.init();
    console.log('App initialized with routing');
}

initApp().catch(console.error);