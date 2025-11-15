import Handlebars from 'handlebars';
import { ajax } from '../../modules/ajax';
import { loginStore } from '../../stores/storeLogin';

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
    id: string;
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
            // 1. Запрашиваем ВСЮ статистику (включая список обращений) с одного эндпоинта
            const statsRes = await ajax.get('/appeals/statistics');
            if (statsRes.status !== 200) {
                throw new Error(`Stats error: ${statsRes.status}`);
            }
            const statsData = statsRes.data;

            if (!statsData) {
                throw new Error('No data received from server');
            }

            const currentUser = loginStore.getState();

            // 2. Подготавливаем контекст для шаблона
            // Извлекаем данные из полученного объекта
            const total = statsData.total || 0;
            const byCategory = statsData.byCategory || {};
            const byStatus = statsData.byStatus || {};
            let supportRequests: SupportRequest[] = [];

            // Парсим список обращений из поля "Appeals"
            if (Array.isArray(statsData.appeals)) {
                supportRequests = statsData.appeals.map((req: any) => {
                    // Создаем объект, который соответствует интерфейсу SupportRequest
                    // Используем ТОЧНЫЕ имена полей, как они приходят с бэкенда (через json теги)
                    return {
                        // Обязательные поля
                        id: req.appealId || 0, // ← Из json:"appealId"
                        category: req.category || 'other', // ← Из json:"category"
                        status: req.status || 'open', // ← Из json:"status"
                        title: req.problemDescription || 'Без темы', // ← Из json:"problemDescription"
                        createdAt: req.createdAt ? new Date(req.createdAt * 1000).toISOString() : '', // ← Из json:"createdAt" (int64)


                        // Добавляем читаемые метки и форматированную дату для шаблона
                        categoryLabel: categoryLabels[req.category] || req.category || '—',
                        statusLabel: statusLabels[req.status] || req.status || '—',
                        createdAtFormatted: req.createdAt ? formatDateTime(new Date(req.createdAt * 1000).toISOString()) : '—'
                    };
                });
            }

            // 3. Подготавливаем контекст для шаблона
            const context = {
                total: total,
                byCategory: mapToLabeledList(byCategory, categoryLabels),
                byStatus: mapToLabeledList(byStatus, statusLabels),
                supportRequests: supportRequests // ← Передаем список обращений
            };

            // 4. Рендерим шаблон
            const template = await getStatisticsTemplate();
            const html = template(context);
            const div = document.createElement('div');
            div.innerHTML = html.trim();
            const element = div.firstElementChild as HTMLElement;

            if (!element) {
                throw new Error('Statistics page element not created');
            }

            // Возвращаем отрендеренный элемент
            return element;

        } catch (err) {
            console.error('Failed to render Statistics:', err);

            if (err instanceof Error && err.message.includes('Unexpected token')) {
                console.log('⚠️ Server returned HTML instead of JSON. Check the network tab for the actual response.');
            }

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