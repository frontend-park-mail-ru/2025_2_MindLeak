/**
 * @file index.js
 * @description Точка входа приложения. Инициализирует компоненты: Header, ленту постов с бесконечной прокруткой.
 * Загружает посты и отображает их в виде бесконечнй ленты. Обрабатывает ошибки сети и пустые ответы.
 */

import { Header } from '/components/Header/Header.js';
import { SidebarMenu } from '/components/SidebarMenu/SidebarMenu.js';
import { TopBloggers } from '/components/TopBloggers/TopBloggers.js';
import { LoginForm } from '/dist/components/LoginForm/LoginForm.js'; //перешли на ts -> теперь там скомпил js лежат
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
rootElem.appendChild(headerContainer);

const contentContainer = document.createElement('div');
contentContainer.className = 'content-layout'; 
rootElem.appendChild(contentContainer);

const leftMenu = document.createElement('aside');
leftMenu.className = 'sidebar-left';

/**
 * Основной контент-контейнер
 * @type {HTMLElement}
 */
const pageElement = document.createElement('main');
pageElement.className = 'main-content'; 

const rightMenu = document.createElement('aside'); 
rightMenu.className = 'sidebar-right';

/**
 * Контейнер для отображения ленты постов
 * @type {HTMLDivElement}
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
(async () => {
    const header = new Header({ LoginForm });
    const headerEl = await header.render();
    headerContainer.appendChild(headerEl);
})();


(async () => {
    const sidebar = new SidebarMenu();
    const sidebarEl = await sidebar.render();
    leftMenu.appendChild(sidebarEl);
})();

(async () => {
    const topBloggers = new TopBloggers();
    const topBloggersEl = await topBloggers.render();
    rightMenu.appendChild(topBloggersEl);
})();

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
        const res = await fetch('https://mindleak.ru/api/feed');
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
            { key: 'tag1', icon: '/img/reactions/hot_reaction.svg', count: '52' },
            { key: 'tag2', icon: '/img/reactions/smile_reaction.svg', count: '1,2k' }
        ],
        commentsCount: '12',
        repostsCount: '4',
        viewsCount: '1,1k'
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

    feedWrapper.insertBefore(fragment, sentinel);
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
feedWrapper.appendChild(sentinel);

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
    feedWrapper.innerHTML = '';

    const errorEl = document.createElement('div');
    errorEl.className = 'feed-error';
    errorEl.textContent = message;
    feedWrapper.appendChild(errorEl);
}

observer.observe(sentinel);

loadMorePosts();