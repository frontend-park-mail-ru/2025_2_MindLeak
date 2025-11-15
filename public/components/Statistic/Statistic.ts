import Handlebars from 'handlebars';

let statisticsTemplate: Handlebars.TemplateDelegate | null = null;

const categoryLabels: Record<string, string> = {
    bug: 'Баг',
    feature: 'Предложение',
    complaint: 'Продуктовая жалоба'
};

const statusLabels: Record<string, string> = {
    open: 'Открыто',
    in_progress: 'В работе',
    closed: 'Закрыто'
};

interface StatisticData {
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
}

interface SupportRequest {
    id: number;
    authorName: string;
    authorId: number;
    category: string;
    status: string;
    title: string;
    createdAt: string; // ISO string
}

function mapToLabeledList(
    data: Record<string, number>,
    labels: Record<string, string>
): { label: string; value: number }[] {
    return Object.entries(data).map(([key, value]) => ({
        label: labels[key] || key,
        value
    }));
}

function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function getStatisticsTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (statisticsTemplate) return statisticsTemplate;

    const res = await fetch('/components/Statistic/Statistic.hbs');
    const source = await res.text();
    statisticsTemplate = Handlebars.compile(source);
    return statisticsTemplate;
}

export class Statistic {
    // Добавляем свойство для хранения ссылок на обработчики событий
    private eventListeners: { element: Element; type: string; listener: EventListener }[] = [];

    async render(): Promise<HTMLElement> {
        try {
            // 1. Запрашиваем агрегированную статистику
            const statsRes = await fetch('/api/statistics');
            if (!statsRes.ok) throw new Error(`Stats error: ${statsRes.status}`);
            const stats: StatisticData = await statsRes.json();

            // 2. Запрашиваем список всех обращений
            const requestsRes = await fetch('/api/support-requests');
            let supportRequests: SupportRequest[] = [];
            if (requestsRes.ok) {
                const rawData = await requestsRes.json();
                // Предполагаем, что ответ — { items: [...] } или просто массив
                const rawList = Array.isArray(rawData) ? rawData : rawData.items || [];

                supportRequests = rawList.map((req: any) => ({
                    id: req.id,
                    authorName: req.authorName || req.author_name || '—',
                    authorId: req.authorId || req.author_id || 0,
                    category: req.category || 'other',
                    status: req.status || 'open',
                    title: req.title || 'Без темы',
                    createdAt: req.createdAt || req.created_at || '',
                    // Добавляем читаемые метки и форматированную дату для шаблона
                    categoryLabel: categoryLabels[req.category] || req.category || '—',
                    statusLabel: statusLabels[req.status] || req.status || '—',
                    createdAtFormatted: req.createdAt ? formatDateTime(req.createdAt) : '—'
                }));
            }

            // 3. Подготавливаем контекст для шаблона
            const context = {
                total: stats.total,
                byCategory: mapToLabeledList(stats.byCategory, categoryLabels),
                byStatus: mapToLabeledList(stats.byStatus, statusLabels),
                supportRequests // ← новое поле
            };

            // 4. Рендерим
            const template = await getStatisticsTemplate();
            const html = template(context);

            const div = document.createElement('div');
            div.innerHTML = html.trim();
            const element = div.firstElementChild as HTMLElement;

            if (!element) {
                throw new Error('Statistics page element not created');
            }

            // Если нужно добавить обработчики событий, сохраняем их ссылки
            // this.attachEventListeners(element);

            return element;
        } catch (err) {
            console.error('Failed to render Statistics:', err);

            const errorDiv = document.createElement('div');
            errorDiv.className = 'statistics-page';
            errorDiv.innerHTML = `
                <div class="statistics-container">
                    <div class="statistics-header">
                        <h1 class="statistics-title">Статистика обращений</h1>
                    </div>
                    <div class="global-error">
                        Не удалось загрузить статистику. Попробуйте позже.
                    </div>
                </div>
            `;
            return errorDiv;
        }
    }

    // Пример метода для добавления обработчиков событий (если понадобится)
    private attachEventListeners(element: HTMLElement): void {
        // Например, если нужно обработать клик по строке таблицы
        const tableRows = element.querySelectorAll('.statistics-table tbody tr');
        tableRows.forEach((row, index) => {
            const clickListener = (event: Event) => {
                console.log('Clicked on row:', index);
                // Дополнительная логика
            };
            row.addEventListener('click', clickListener);
            this.eventListeners.push({ element: row, type: 'click', listener: clickListener });
        });
    }

    // Метод destroy для очистки ресурсов
    destroy(): void {
        // Удаляем все обработчики событий
        this.eventListeners.forEach(({ element, type, listener }) => {
            element.removeEventListener(type, listener);
        });
        this.eventListeners = [];

        // Дополнительная очистка если нужна
        console.log('Statistic component destroyed');
    }
}