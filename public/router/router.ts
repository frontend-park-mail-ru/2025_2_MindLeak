import { loginStore } from '../stores/storeLogin';
import { LoginFormView } from '../views/viewLogin';
import { dispatcher } from '../dispatcher/dispatcher';

interface Route {
    path: string;
    view: any;
    title?: string;
    requiresAuth?: boolean;
}

export class Router {
    private routes: Route[] = [];
    private currentView: any = null;
    private isInitialized: boolean = false;
    private pendingRoute: { route: Route; path?: string } | null = null;
    private isRendering: boolean = false;
    private loginModal: HTMLElement | null = null;

    constructor() {
        this.handleRouteChange = this.handleRouteChange.bind(this);
        this.handleLinkClick = this.handleLinkClick.bind(this);
        this.handleLoginStoreChange = this.handleLoginStoreChange.bind(this);
    }

    addRoute(path: string, view: any, title?: string, requiresAuth: boolean = false): void {
        this.routes.push({ path, view, title, requiresAuth });
    }

    init(): void {
        if (this.isInitialized) return;

        window.addEventListener('popstate', this.handleRouteChange);
        document.addEventListener('click', this.handleLinkClick);
        loginStore.addListener(this.handleLoginStoreChange);

        // Сразу проверяем авторизацию и запускаем роутинг
        this.checkAuthAndRoute();

        this.isInitialized = true;
    }

    private async checkAuthAndRoute(): Promise<void> {
        const state = loginStore.getState();
        
        // Если уже есть сохраненное состояние авторизации, используем его
        if (state.isLoggedIn) {
            console.log('✅ [ROUTER] User already logged in from store');
            this.handleRouteChange();
            return;
        }

        // Если нет сохраненного состояния, запускаем проверку
        console.log('⏳ [ROUTER] Checking auth status...');
        dispatcher.dispatch('LOGIN_CHECK_REQUEST');
        
        // Ждем завершения проверки авторизации
        await new Promise<void>((resolve) => {
            const authCheckHandler = () => {
                const newState = loginStore.getState();
                if (!newState.isLoading) {
                    loginStore.removeListener(authCheckHandler);
                    console.log('✅ [ROUTER] Auth check completed, isLoggedIn:', newState.isLoggedIn);
                    resolve();
                }
            };
            loginStore.addListener(authCheckHandler);
        });

        this.handleRouteChange();
    }

    private closeLoginModal(): void {
        if (this.loginModal && this.loginModal.parentNode) {
            this.loginModal.parentNode.removeChild(this.loginModal);
            this.loginModal = null;
            console.log('🚪 [ROUTER] Login modal closed');
        }
    }

    private async handleRouteChange(): Promise<void> {
        const path = window.location.pathname + window.location.search;
        await this.navigate(path, false);
    }

    private handleLinkClick(e: Event): void {
        const target = e.target as HTMLElement;
        const link = target.closest('a[href]') as HTMLAnchorElement;
        
        if (!link) return;

        const href = link.getAttribute('href');

        if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        if (href.startsWith('#')) {
            return;
        }

        if (link.hasAttribute('data-router-ignore')) {
            return;
        }

        e.preventDefault();
        this.navigate(href);
    }

// router.ts - обновите метод navigate:

    async navigate(path: string, updateHistory: boolean = true): Promise<void> {
        // СТРОГАЯ ПРОВЕРКА СТАТИЧЕСКИХ ФАЙЛОВ
        if (this.isStaticFileRequest(path)) {
            console.log('📁 [ROUTER] Static file request, skipping router:', path);
            return;
        }

        const normalizedPath = path === '/' ? '/' : `/${path.replace(/^\/+/, '')}`;

        if (updateHistory) {
            window.history.pushState({}, '', normalizedPath);
        }

        const route = this.findRoute(normalizedPath);
        
        if (route) {
            await this.renderView(route, normalizedPath);
        } else {
            await this.show404();
        }
    }

    // ДОБАВЬТЕ ЭТОТ МЕТОД:
    private isStaticFileRequest(path: string): boolean {
        const staticExtensions = ['.html', '.css', '.js', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.json'];
        const pathname = path.split('?')[0].toLowerCase();
        
        // Проверяем расширения файлов
        if (staticExtensions.some(ext => pathname.endsWith(ext))) {
            return true;
        }
        
        // Проверяем конкретные статические маршруты
        const staticRoutes = ['/TechSupport.html', '/bundle.js', '/handlebars/', '/img/'];
        if (staticRoutes.some(route => pathname.includes(route))) {
            return true;
        }
        
        return false;
    }

    private findRoute(path: string): Route | null {
        const pathname = path.split('?')[0];
        const normalizedPath = pathname === '/' ? '/' : `/${pathname.replace(/^\/+/, '')}`;
        
        // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА СТАТИЧЕСКИХ ФАЙЛОВ
        if (normalizedPath.includes('.html') || normalizedPath.includes('.css') || normalizedPath.includes('.js')) {
            console.log('📁 [ROUTER] Static file in findRoute, skipping:', normalizedPath);
            return null;
        }
        
        console.log('🔍 [ROUTER] Searching route for path:', normalizedPath);
        
        // Сначала ищем точное совпадение
        const exactMatch = this.routes.find(route => route.path === normalizedPath);
        if (exactMatch) {
            console.log('[ROUTER] Exact match found:', exactMatch.path);
            return exactMatch;
        }

        // Затем ищем совпадение по паттерну (с параметрами)
        for (const route of this.routes) {
            if (route.path.includes(':')) {
                const routeRegex = this.pathToRegex(route.path);
                const match = normalizedPath.match(routeRegex);
                
                if (match) {
                    console.log('[ROUTER] Pattern match found:', route.path, 'for', normalizedPath);
                    return route;
                }
            }
        }

        console.log('[ROUTER] No route found for:', normalizedPath);
        return null;
    }

    private extractParams(routePath: string, actualPath: string): any {
        const params: any = {};
        
        const routeParts = routePath.split('/');
        const actualPathname = actualPath.split('?')[0];
        const actualParts = actualPathname.split('/');
        
        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                const paramName = routeParts[i].slice(1);
                params[paramName] = actualParts[i] || '';
            }
        }
        
        try {
            const url = new URL(actualPath, window.location.origin);
            url.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } catch (e) {
            // Игнорируем ошибки парсинга URL
        }
        
        return params;
    }

    private pathToRegex(path: string): RegExp {
        const pattern = path.replace(/:\w+/g, '([^/]+)');
        return new RegExp(`^${pattern}$`);
    }

    private async renderView(route: Route, path?: string): Promise<void> {
        // Защита от параллельного рендеринга
        if (this.isRendering) {
            console.log('[ROUTER] Render already in progress, skipping...');
            return;
        }

        console.log('[ROUTER] renderView started for route:', route.path, 'path:', path);
        
        this.isRendering = true;

        try {
            const isAuthenticated = this.isUserAuthenticated();
            console.log('[ROUTER] Auth status:', { 
                isAuthenticated, 
                requiresAuth: route.requiresAuth 
            });

            // Проверяем, требует ли маршрут авторизации
            if (route.requiresAuth && !isAuthenticated) {
                console.log('[ROUTER] Route requires auth, showing login');
                this.pendingRoute = { route, path };
                
                // Закрываем предыдущее модальное окно, если есть
                this.closeLoginModal();
                
                const loginView = new LoginFormView(path);
                this.loginModal = await loginView.render();
                document.body.appendChild(this.loginModal);
                return;
            }

            // Если мы дошли сюда и есть модальное окно - закрываем его
            if (this.loginModal) {
                console.log('[ROUTER] Closing login modal - user can access protected route');
                this.closeLoginModal();
            }

            // Уничтожаем предыдущий view
            if (this.currentView && typeof this.currentView.destroy === 'function') {
                console.log('[ROUTER] Destroying previous view');
                this.currentView.destroy();
            }

            if (route.title) {
                document.title = route.title;
            }

            try {
                const ViewClass = route.view;
                
                let params = {};
                if (path) {
                    params = this.extractParams(route.path, path);
                    console.log('[ROUTER] Extracted params:', params);
                }
                
                const content = document.getElementById('root');
                if (content) {
                    console.log('[ROUTER] Creating new view instance');
                    this.currentView = new ViewClass(content, params);
                    console.log('[ROUTER] Clearing content and rendering...');
                    content.innerHTML = '';
                    
                    if (typeof this.currentView.render === 'function') {
                        console.log('[ROUTER] Calling view.render()...');
                        const element = await this.currentView.render();
                        content.appendChild(element);
                        console.log('[ROUTER] View rendered successfully');
                    } else {
                        console.log('[ROUTER] View has no render method');
                    }
                } else {
                    console.log('[ROUTER] No root element found');
                }

            } catch (error) {
                console.error('[ROUTER] Error rendering view:', error);
                await this.show404();
            }
        } finally {
            this.isRendering = false;
        }
    }

    private isUserAuthenticated(): boolean {
        const state = loginStore.getState();
        return state.isLoggedIn;
    }

    private handleLoginStoreChange(): void {
        const state = loginStore.getState();
        
        // Если пользователь авторизовался и есть ожидающий маршрут
        if (state.isLoggedIn && this.pendingRoute && !state.isLoading) {
            console.log('[ROUTER] User logged in with pending route');
            const { route, path } = this.pendingRoute;
            this.pendingRoute = null;
            
            // Закрываем модальное окно авторизации
            this.closeLoginModal();
            
            // Переходим на ожидающий маршрут
            this.navigate(path || route.path, false);
        }
        
        // Если пользователь разлогинился и есть модальное окно - закрываем его
        if (!state.isLoggedIn && this.loginModal) {
            console.log('[ROUTER] User logged out, closing modal');
            this.closeLoginModal();
        }
    }

    private async show404(): Promise<void> {
        const content = document.getElementById('root');
        if (content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h1>404 - Страница не найдена</h1>
                    <p>Запрошенная страница не существует.</p>
                    <a href="/" data-router-link>Вернуться на главную</a>
                </div>
            `;
        }
    }

    destroy(): void {
        window.removeEventListener('popstate', this.handleRouteChange);
        document.removeEventListener('click', this.handleLinkClick);
        loginStore.removeListener(this.handleLoginStoreChange);
        
        // Закрываем модальное окно при уничтожении роутера
        this.closeLoginModal();
        
        if (this.currentView && typeof this.currentView.destroy === 'function') {
            this.currentView.destroy();
        }
        
        this.isInitialized = false;
        this.isRendering = false;
    }
}

export const router = new Router();