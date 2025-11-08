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
    private isAuthCheckComplete: boolean = false;
    private authCheckPromise: Promise<void> | null = null;

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

        // Запускаем проверку авторизации при инициализации роутера
        this.startAuthCheck();

        window.addEventListener('popstate', this.handleRouteChange);
        document.addEventListener('click', this.handleLinkClick);
        loginStore.addListener(this.handleLoginStoreChange);

        this.handleRouteChange();
        this.isInitialized = true;

    }

    private startAuthCheck(): void {
        // Если проверка уже запущена, не запускаем повторно
        if (this.authCheckPromise) return;
        
        this.authCheckPromise = new Promise<void>((resolve) => {
            const state = loginStore.getState();
            
            // Если проверка уже не в процессе, значит она завершена
            if (!state.isLoading) {
                this.isAuthCheckComplete = true;
                resolve();
                return;
            }

            // Ждем завершения проверки авторизации
            const unsubscribe = loginStore.addListener(() => {
                const newState = loginStore.getState();
                
                if (!newState.isLoading) {
                    this.isAuthCheckComplete = true;
                    resolve();
                }
            });
        });

        // Запускаем проверку авторизации через API
        dispatcher.dispatch('LOGIN_CHECK_REQUEST');
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

    async navigate(path: string, updateHistory: boolean = true): Promise<void> {
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

    private findRoute(path: string): Route | null {
        const pathname = path.split('?')[0];
        const normalizedPath = pathname === '/' ? '/' : `/${pathname.replace(/^\/+/, '')}`;
        
        
        // Сначала ищем точное совпадение
        const exactMatch = this.routes.find(route => route.path === normalizedPath);
        if (exactMatch) {
            return exactMatch;
        }

        // Затем ищем совпадение по паттерну (с параметрами)
        for (const route of this.routes) {
            if (route.path.includes(':')) {
                const routeRegex = this.pathToRegex(route.path);
                const match = normalizedPath.match(routeRegex);
                
                if (match) {
                    return route;
                }
            }
        }

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
        }
        
        return params;
    }

    private pathToRegex(path: string): RegExp {
        const pattern = path.replace(/:\w+/g, '([^/]+)');
        return new RegExp(`^${pattern}$`);
    }

    private async renderView(route: Route, path?: string): Promise<void> {
        
        // Если проверка авторизации еще не завершена, ждем
        if (!this.isAuthCheckComplete && this.authCheckPromise) {
            await this.authCheckPromise;
        }

        // Проверяем, требует ли маршрут авторизации
        if (route.requiresAuth && !this.isUserAuthenticated()) {
            
            this.pendingRoute = { route, path };
            
            const loginView = new LoginFormView(path);
            const modal = await loginView.render();
            document.body.appendChild(modal);
            return;
        }

        
        if (this.currentView && typeof this.currentView.destroy === 'function') {
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
            }
            
            const content = document.getElementById('root');
            if (content) {
                this.currentView = new ViewClass(content, params);
                content.innerHTML = '';
                
                if (typeof this.currentView.render === 'function') {
                    const element = await this.currentView.render();
                    content.appendChild(element);
                }
            }

        } catch (error) {
            await this.show404();
        }
    }

    private isUserAuthenticated(): boolean {
        const state = loginStore.getState();
        return state.isLoggedIn;
    }

    private handleLoginStoreChange(): void {
        const state = loginStore.getState();
        
        // Если пользователь авторизовался и есть ожидающий маршрут
        if (state.isLoggedIn && this.pendingRoute) {
            
            const { route, path } = this.pendingRoute;
            this.pendingRoute = null;
            
            this.renderView(route, path);
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
        
        if (this.currentView && typeof this.currentView.destroy === 'function') {
            this.currentView.destroy();
        }
        
        this.isInitialized = false;
        this.authCheckPromise = null;
    }
}

export const router = new Router();