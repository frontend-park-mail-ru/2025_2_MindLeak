interface Route {
    path: string;
    view: any;
    title?: string;
}

export class Router {
    private routes: Route[] = [];
    private currentView: any = null;
    private isInitialized: boolean = false;

    constructor() {
        this.handleRouteChange = this.handleRouteChange.bind(this);
        this.handleLinkClick = this.handleLinkClick.bind(this);
    }

    addRoute(path: string, view: any, title?: string): void {
        this.routes.push({ path, view, title });
    }

    init(): void {
        if (this.isInitialized) return;

        // обработчик изменения URL
        window.addEventListener('popstate', this.handleRouteChange);
        
        // перехват кликов по ссылкам
        document.addEventListener('click', this.handleLinkClick);

        // первоначальная загрузка маршрута
        this.handleRouteChange();
        this.isInitialized = true;

        console.log('Router initialized');
    }

    private async handleRouteChange(): Promise<void> {
        const path = window.location.pathname;
        await this.navigate(path, false);
    }

    private handleLinkClick(e: Event): void {
        const target = e.target as HTMLElement;
        const link = target.closest('a[href]') as HTMLAnchorElement;
        
        if (!link) return;

        const href = link.getAttribute('href');

        // игнор внеш ссылки и ссылки с разными протоколами
        if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        // игнорир якорные ссылки
        if (href.startsWith('#')) {
            return;
        }

        // игнорир ссылки с data-router-ignore
        if (link.hasAttribute('data-router-ignore')) {
            console.log('Ignoring link with data-router-ignore:', href);
            return;
        }

        e.preventDefault();
        this.navigate(href);
    }

    async navigate(path: string, updateHistory: boolean = true): Promise<void> {
        const normalizedPath = path === '/' ? '/' : `/${path.replace(/^\/+/, '')}`;

        if (updateHistory) {
        window.history.pushState(null, '', normalizedPath);
        }

        const route = this.findRoute(normalizedPath);
        
        if (route) {
        await this.renderView(route);
        } else {
        await this.show404();
        }
    }

    private findRoute(path: string): Route | null {
        const exactMatch = this.routes.find(route => route.path === path);
        if (exactMatch) return exactMatch;

        for (const route of this.routes) {
        if (route.path.includes(':')) {
            const routeRegex = this.pathToRegex(route.path);
            if (routeRegex.test(path)) {
            return route;
            }
        }
        }

        return null;
    }

    private pathToRegex(path: string): RegExp {
        const pattern = path.replace(/:\w+/g, '([^/]+)');
        return new RegExp(`^${pattern}$`);
    }

    private async renderView(route: Route): Promise<void> {
        if (this.currentView && typeof this.currentView.destroy === 'function') {
        this.currentView.destroy();
        }

        if (route.title) {
        document.title = route.title;
        }

        try {
        const ViewClass = route.view;
        this.currentView = new ViewClass();
        
        const content = document.getElementById('root');
        if (content) {
            content.innerHTML = '';
            
            if (typeof this.currentView.render === 'function') {
            const element = await this.currentView.render();
            content.appendChild(element);
            } else if (typeof this.currentView === 'function') {
            const element = await this.currentView();
            content.appendChild(element);
            }
        }

        console.log(`Rendered view for route: ${route.path}`);
        } catch (error) {
        console.error('Error rendering view:', error);
        await this.show404();
        }
    }

    //страница 404 todo иначе
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
        
        if (this.currentView && typeof this.currentView.destroy === 'function') {
            this.currentView.destroy();
        }
        
        this.isInitialized = false;
    }
}

export const router = new Router();