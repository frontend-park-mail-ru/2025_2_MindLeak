/**
 * @file index.js
 * @description Точка входа приложения. Инициализирует компоненты: Header, ленту постов с бесконечной прокруткой.
 * Загружает посты и отображает их в виде бесконечнй ленты. Обрабатывает ошибки сети и пустые ответы.
 */

import { Header } from '/components/Header/Header.js';
import { LoginForm } from '/components/LoginForm/LoginForm.js';
import { PostCard } from '/components/PostCard/PostCard.js';

/**
 * Корневой элемент приложения
 * @type {HTMLElement}
 */
const rootElem = document.getElementById('root');

/**
 * Контейнер для шапки
 * @type {HTMLElement}
 */
const headerContainer = document.createElement('header');

/**
 * Основной контент-контейнер
 * @type {HTMLElement}
 */
const pageElement = document.createElement('main');
rootElem.appendChild(headerContainer);
rootElem.appendChild(pageElement);

/**
 * Инициализация шапки
 */
(async () => {
    const header = new Header({ LoginForm });
    const headerEl = await header.render();
    headerContainer.appendChild(headerEl);
})();

/**
 * Контейнер для отображения ленты постов
 * @type {HTMLDivElement}
 */
const feedContainer = document.createElement('div');
feedContainer.className = 'feed';
pageElement.appendChild(feedContainer);

/**
 * Виртуальный индекс для циклического отображения постов (прототип бесконечной ленты)
 * @type {number}
 */
let virtualPostIndex = 0;

/**
 * Количество постов, загружаемых за один раз
 * @constant
 * @type {number}
 */
const POSTS_PER_LOAD = 3;

/**
 * Выполняет запрос к API для получения ленты постов
 * @async
 * @returns {Promise<{success: boolean, data?: Array<Object>, error?: string}>}
 *   Объект результата:
 *   success: true при успешном ответе, false при ошибке
 *   data: массив постов (если success === true)
 *   error: сообщение об ошибке (если success === false)
 */
async function fetchPosts() {
    try {
        const res = await fetch('http://62.109.19.84:8090/feed');
        if (!res.ok) throw new Error('Ошибка загрузки постов');
        return { success: true, data: await res.json() }; //200 + посты
    } catch (err) {
        console.error('Не удалось загрузить посты:', err);
        return { success: false, error: 'Ошибка соединения с интернетом 😭' }; 
    }
}

/**
 * Преобразует пост из формата API в формат, понятный компоненту PostCard
 * @param {Object} apiPost - Пост в формате API
 * @param {string} [apiPost.author_name] - Имя автора
 * @param {string} [apiPost.author_avatar] - URL аватара автора
 * @param {string} [apiPost.title] - Заголовок поста
 * @param {string} [apiPost.content] - Текст поста
 * @param {string} [apiPost.image] - URL изображения
 * @returns {Object} Пост в формате UI-компонента
 */
function transformPost(apiPost) {
    return {
        user: {
            name: apiPost.author_name || 'Аноним',
            subtitle: 'Блог',
            avatar: apiPost.author_avatar || '/img/LogoMain.svg',
            isSubscribed: false
        },
        title: apiPost.title,
        text: apiPost.content,
        image: apiPost.image?.trim() || '',
        tags: [
            { key: 'tag1', icon: '/img/icons/js.svg', count: 'тег1' },
            { key: 'tag2', icon: '/img/icons/web.svg', count: 'тег2' }
        ],
        commentsCount: '0',
        repostsCount: '0',
        viewsCount: '0'
    };
}

/**
 * Рендерит один пост через компонент PostCard
 * @async
 * @param {Object} postData - данные поста в формате UI
 * @returns {Promise<HTMLElement>} - отрендеренный DOM-элемент поста
 */
async function renderPost(postData) {
    const postCard = new PostCard(postData);
    return await postCard.render();
}

/**
 * Массив всех загруженных постов
 * @type {Array<Object>}
 */
let allPosts = [];

/**
 * Флаг: завершена ли загрузка данных с сервера
 * @type {boolean}
 */
let isDataLoaded = false;

/**
 * Флаг: идёт ли сейчас загрузка данных (для предотвращения дублирующих запросов)
 * @type {boolean}
 */
let isLoadingData = false;

/**
 * Сообщение об ошибке, если загрузка не удалась
 * @type {string|null}
 */
let loadError = null;

/**
 * Загружает данные с сервера один раз.
 * При ошибке сохраняет сообщение и отображает его.
 * @async
 * @returns {Promise<void>}
 */
async function loadData() {
    if (isDataLoaded || isLoadingData) return;

    isLoadingData = true;
    try {
        const result = await fetchPosts();
        if (!result.success) {
            loadError = result.error;
            showFeedError(loadError);
            return;
        }
        allPosts = result.data.map(transformPost);
        isDataLoaded = true;

        if (allPosts.length === 0) {
            observer.unobserve(sentinel);
            showFeedError('Нет доступных постов');
        }
    } finally {
        isLoadingData = false;
    }
}

/**
 * Рендерит следующую порцию постов.
 * @async
 * @returns {Promise<void>}
 */
async function renderNextPosts() {
    if (loadError || !isDataLoaded || allPosts.length === 0) return;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < POSTS_PER_LOAD; i++) {
        const postIndex = virtualPostIndex % allPosts.length;
        const postData = { ...allPosts[postIndex] };
        const postEl = await renderPost(postData);
        fragment.appendChild(postEl);
        virtualPostIndex++;
    }

    feedContainer.insertBefore(fragment, sentinel);
}

/**
 * Основная функция подгрузки постов. Гарантирует, что данные загружены, а затем рендерит следующую порцию.
 * Вызывается при первом рендере и при прокрутке до конца ленты.
 * @async
 * @returns {Promise<void>}
 */
async function loadMorePosts() {
    await loadData();
    if (isDataLoaded && !loadError && allPosts.length > 0) {
        renderNextPosts();
    }
}

/**
 * Элемент-сенсор для Intersection Observer
 * @type {HTMLDivElement}
 */
const sentinel = document.createElement('div');
sentinel.style.height = '20px';
feedContainer.appendChild(sentinel);

/**
 * Наблюдатель за прокруткой. Срабатывает, когда sentinel попадает в зону видимости.
 * @type {IntersectionObserver}
 */
const observer = new IntersectionObserver((entries) => {
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
 * @returns {void}
 */
function showFeedError(message) {
    if (sentinel.parentNode) sentinel.remove();
    feedContainer.innerHTML = '';

    const errorEl = document.createElement('div');
    errorEl.className = 'feed-error';
    errorEl.textContent = message;
    feedContainer.appendChild(errorEl);
}

observer.observe(sentinel);

loadMorePosts();