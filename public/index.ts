/**
 * @file index.ts
 * @description Точка входа приложения. Инициализирует компоненты: Header, ленту постов с бесконечной прокруткой.
 * Загружает посты и отображает их в виде бесконечной ленты. Обрабатывает ошибки сети и пустые ответы.
 */

import { Header } from './components/Header/Header.js';
import { SidebarMenu } from './components/SidebarMenu/SidebarMenu.js';
import { TopBloggers } from './components/TopBloggers/TopBloggers.js';
import { LoginForm } from './components/LoginForm/LoginForm.js';
import { PostCard } from './components/PostCard/PostCard.js';

/**
 * Интерфейс для поста из API
 */
interface ApiPost {
    author_name?: string;
    author_avatar?: string;
    title?: string;
    content?: string;
    image?: string;
}

/**
 * Интерфейс для преобразованного поста (должен совпадать с PostCardProps)
 */
interface TransformedPost {
    user: {
        name: string;
        subtitle: string;
        avatar: string;
        isSubscribed: boolean;
    };
    title: string;
    text: string;
    image: string;
    tags: string[];
    commentsCount: number;
    repostsCount: number;
    viewsCount: number;
}

/**
 * Интерфейс для результата загрузки постов
 */
interface FetchPostsResult {
    success: boolean;
    data?: ApiPost[];
    error?: string;
}

/**
 * Корневой элемент приложения
 */
const rootElem = document.getElementById('root') as HTMLElement;

if (!rootElem) {
    throw new Error('Root element not found');
}

/**
 * Контейнер для шапки
 */
const headerContainer = document.createElement('header');
rootElem.appendChild(headerContainer);

const contentContainer = document.createElement('div');
contentContainer.className = 'content-layout'; 
rootElem.appendChild(contentContainer);

const leftMenu = document.createElement('aside');
leftMenu.className = 'sidebar-left';

/**
 * Основной контент-контейнер
 */
const pageElement = document.createElement('main');
pageElement.className = 'main-content'; 

const rightMenu = document.createElement('aside'); 
rightMenu.className = 'sidebar-right';

/**
 * Контейнер для отображения ленты постов
 */
const feedWrapper = document.createElement('div');
feedWrapper.className = 'feed';

pageElement.appendChild(feedWrapper);
contentContainer.appendChild(leftMenu);
contentContainer.appendChild(pageElement);
contentContainer.appendChild(rightMenu);

/**
 * Инициализация шапки
 */
(async (): Promise<void> => {
    const header = new Header({ LoginForm });
    const headerEl = await header.render();
    headerContainer.appendChild(headerEl);
})();

/**
 * Инициализация бокового меню
 */
(async (): Promise<void> => {
    const sidebar = new SidebarMenu();
    const sidebarEl = await sidebar.render();
    leftMenu.appendChild(sidebarEl);
})();

/**
 * Инициализация топа блогеров
 */
(async (): Promise<void> => {
    const topBloggers = new TopBloggers();
    const topBloggersEl = await topBloggers.render();
    rightMenu.appendChild(topBloggersEl);
})();

/**
 * Виртуальный индекс для циклического отображения постов (прототип бесконечной ленты)
 */
let virtualPostIndex: number = 0;

/**
 * Количество постов, загружаемых за один раз
 */
const POSTS_PER_LOAD: number = 3;

/**
 * Выполняет запрос к API для получения ленты постов
 * @returns {Promise<FetchPostsResult>} Объект результата загрузки
 */
async function fetchPosts(): Promise<FetchPostsResult> {
    try {
        const res = await fetch('https://mindleak.ru/api/feed');
        if (!res.ok) throw new Error('Ошибка загрузки постов');
        return { success: true, data: await res.json() };
    } catch (err) {
        console.error('Не удалось загрузить посты:', err);
        return { 
            success: false, 
            error: 'Ошибка соединения с интернетом 😭' 
        }; 
    }
}

/**
 * Преобразует пост из формата API в формат, понятный компоненту PostCard
 * @param {ApiPost} apiPost - Пост в формате API
 * @returns {TransformedPost} Пост в формате UI-компонента
 */
function transformPost(apiPost: ApiPost): TransformedPost {
    return {
        user: {
            name: apiPost.author_name || 'Аноним',
            subtitle: 'Блог',
            avatar: apiPost.author_avatar || '/img/LogoMain.svg',
            isSubscribed: false
        },
        title: apiPost.title || '',
        text: apiPost.content || '',
        image: apiPost.image?.trim() || '',
        tags: ['технологии', 'программирование'],
        commentsCount: 12,
        repostsCount: 4,
        viewsCount: 1100
    };
}

/**
 * Рендерит один пост через компонент PostCard
 * @param {TransformedPost} postData - данные поста в формате UI
 * @returns {Promise<HTMLElement>} - отрендеренный DOM-элемент поста
 */
async function renderPost(postData: TransformedPost): Promise<HTMLElement> {
    const postCard = new PostCard(postData);
    return await postCard.render();
}

/**
 * Массив всех загруженных постов
 */
let allPosts: TransformedPost[] = [];

/**
 * Флаг: завершена ли загрузка данных с сервера
 */
let isDataLoaded: boolean = false;

/**
 * Флаг: идёт ли сейчас загрузка данных (для предотвращения дублирующих запросов)
 */
let isLoadingData: boolean = false;

/**
 * Сообщение об ошибке, если загрузка не удалась
 */
let loadError: string | null = null;

/**
 * Загружает данные с сервера один раз.
 * При ошибке сохраняет сообщение и отображает его.
 */
async function loadData(): Promise<void> {
    if (isDataLoaded || isLoadingData) return;

    isLoadingData = true;
    try {
        const result = await fetchPosts();
        if (!result.success) {
            loadError = result.error || 'Неизвестная ошибка';
            showFeedError(loadError);
            return;
        }
        
        if (result.data) {
            allPosts = result.data.map(transformPost);
            isDataLoaded = true;

            if (allPosts.length === 0) {
                observer.unobserve(sentinel);
                showFeedError('Нет доступных постов');
            }
        }
    } finally {
        isLoadingData = false;
    }
}

/**
 * Рендерит следующую порцию постов.
 */
async function renderNextPosts(): Promise<void> {
    if (loadError || !isDataLoaded || allPosts.length === 0) return;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < POSTS_PER_LOAD; i++) {
        const postIndex = virtualPostIndex % allPosts.length;
        const postData = { ...allPosts[postIndex] };
        const postEl = await renderPost(postData);
        fragment.appendChild(postEl);
        virtualPostIndex++;
    }

    feedWrapper.insertBefore(fragment, sentinel);
}

/**
 * Основная функция подгрузки постов. Гарантирует, что данные загружены, а затем рендерит следующую порцию.
 * Вызывается при первом рендере и при прокрутке до конца ленты.
 */
async function loadMorePosts(): Promise<void> {
    await loadData();
    if (isDataLoaded && !loadError && allPosts.length > 0) {
        await renderNextPosts();
    }
}

/**
 * Элемент-сенсор для Intersection Observer
 */
const sentinel = document.createElement('div');
sentinel.style.height = '20px';
feedWrapper.appendChild(sentinel);

/**
 * Наблюдатель за прокруткой. Срабатывает, когда sentinel попадает в зону видимости.
 */
const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting) {
        loadMorePosts();
    }
}, {
    rootMargin: '100px' 
});

/**
 * Отображает сообщение об ошибке в контейнере ленты.
 * Удаляет sentinel и очищает контейнер.
 * @param {string} message - Текст ошибки для отображения
 */
function showFeedError(message: string): void {
    if (sentinel.parentNode) sentinel.remove();
    feedWrapper.innerHTML = '';

    const errorEl = document.createElement('div');
    errorEl.className = 'feed-error';
    errorEl.textContent = message;
    feedWrapper.appendChild(errorEl);
}

observer.observe(sentinel);

loadMorePosts();