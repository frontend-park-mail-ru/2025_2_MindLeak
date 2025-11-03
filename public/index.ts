import { router } from './router/router';
//import { LoginFormView } from './views/viewLogin.js';
//import { SignUpFormView } from './views/viewSignUp.js';
import { HomeView } from './views/viewHome';

async function initApp(): Promise<void> {
    router.addRoute('/', HomeView, 'Mindleak - Главная');
    //router.addRoute('/login', LoginFormView, 'Mindleak - Вход');
    //router.addRoute('/register', SignUpFormView, 'Mindleak - Регистрация');

    router.init();

    console.log('App initialized with routing');
}

initApp().catch(console.error);