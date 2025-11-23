import { router } from '../../router/router';

interface SearchResultsProps {
    users: any[];
    query: string;
    onShowAllResults: () => void;
}

export class SearchResults {
    private element: HTMLElement | null = null;
    private props: SearchResultsProps;

    constructor(props: SearchResultsProps) {
        this.props = props;
    }

    async render(): Promise<HTMLElement> {
        // Загружаем шаблон
        const templateResponse = await fetch('/components/SearchResults/SearchResults.hbs');
        const templateSource = await templateResponse.text();
        
        // Компилируем шаблон
        const template = Handlebars.compile(templateSource);
        
        // Рендерим HTML - ВЫПАДАЮЩИЙ СПИСОК ВСЕГДА ПОКАЗЫВАЕТ КНОПКУ
        const html = template({
            users: this.props.users || []
        });

        console.log('🔍 SearchResults rendered with users:', this.props.users); // Добавляем лог

        // Создаем элемент
        const div = document.createElement('div');
        div.className = 'search-results';
        div.innerHTML = html.trim();

        this.element = div.firstElementChild as HTMLElement;
        
        if (!this.element) {
            // Если не нашли первого ребенка, используем сам div
            this.element = div;
        }

        this.setupEventHandlers();
        
        // Проверяем, есть ли футер после рендера
        const footer = this.element.querySelector('.search-results__footer');
        console.log('🔍 SearchResults footer exists:', !!footer);
        
        return this.element;
    }
    private setupEventHandlers(): void {
        if (!this.element) return;

        // Обработка клика на пользователя
        this.element.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = item.getAttribute('data-user-id');
                console.log('👤 Clicked on user with ID:', userId); // Добавляем лог
                
                if (userId) {
                    // Переходим на страницу профиля
                    router.navigate(`/profile/${userId}`);
                    this.hide();
                } else {
                    console.error('❌ No user ID found for search result');
                }
            });
        });

        // Обработка "Показать все результаты" - ВСЕГДА ЕСТЬ В ФУТЕРЕ
        const showAllLink = this.element.querySelector('[data-action="show-all"]') as HTMLElement;
        if (showAllLink) {
            showAllLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔍 Show all results clicked for query:', this.props.query);
                this.props.onShowAllResults();
                this.hide();
            });
        }
    }

    // Добавляем публичный метод для проверки содержит ли элемент target
    contains(target: Node): boolean {
        return this.element?.contains(target) || false;
    }

    // Добавляем публичный метод для получения элемента
    getElement(): HTMLElement | null {
        return this.element;
    }

    updateProps(newProps: Partial<SearchResultsProps>): void {
        this.props = { ...this.props, ...newProps };
        this.rerender();
    }

    private async rerender(): Promise<void> {
        if (!this.element) return;

        const templateResponse = await fetch('/components/SearchResults/SearchResults.hbs');
        const templateSource = await templateResponse.text();
        const template = Handlebars.compile(templateSource);
        
        const html = template({
            users: this.props.users
        });

        this.element.innerHTML = html;
        this.setupEventHandlers();
    }

    hide(): void {
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }

    destroy(): void {
        this.hide();
        this.element = null;
    }
}