import { Header } from '/components/Header/Header.js';
import { SidebarMenu } from '/components/SidebarMenu/SidebarMenu.js';
import { TopBloggers } from '/components/TopBloggers/TopBloggers.js';
import { LoginForm } from '/components/LoginForm/LoginForm.js';
import { PostCard } from '/components/PostCard/PostCard.js';
import { mockPosts } from '/data/mockPosts.js';

const rootElem = document.getElementById('root');

const headerContainer = document.createElement('header');
rootElem.appendChild(headerContainer);

const contentContainer = document.createElement('div'); // Добавляем контейнер для контента
contentContainer.className = 'content-layout'; // ← как в CSS
rootElem.appendChild(contentContainer);

const leftMenu = document.createElement('aside'); // Исправляем имя переменной
leftMenu.className = 'sidebar-left';

const pageElement = document.createElement('main');
pageElement.className = 'main-content'; // Переименовываем класс

const rightMenu = document.createElement('aside'); // ← ДОБАВЬ ЭТО
rightMenu.className = 'sidebar-right';

const feedWrapper = document.createElement('div'); // ОДИН раз объявляем feedWrapper
feedWrapper.className = 'feed';

pageElement.appendChild(feedWrapper);
contentContainer.appendChild(leftMenu);
contentContainer.appendChild(pageElement);
contentContainer.appendChild(rightMenu);

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

let virtualPostIndex = 0;
const POSTS_PER_LOAD = 3;

async function fetchPosts() {
    try {
        const res = await fetch('http://62.109.19.84:8090/feed');
        if (!res.ok) throw new Error('Ошибка загрузки постов');
        return await res.json();
    } catch (err) {
        console.error('Не удалось загрузить посты:', err);
        return [];
    }
}

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

async function renderPost(postData) {
    const postCard = new PostCard(postData);
    return await postCard.render();
}

let allPosts = [];
let isPostsLoaded = false;

async function loadMorePosts() {
    if (!isPostsLoaded) {
        const rawPosts = await fetchPosts();
        allPosts = (Array.isArray(rawPosts) && rawPosts.length > 0)
            ? rawPosts.map(transformPost)
            : mockPosts.map(transformPost);
        isPostsLoaded = true;
    }

    if (allPosts.length === 0) {
        observer.unobserve(sentinel);
        return;
    }

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

const sentinel = document.createElement('div');
sentinel.style.height = '20px';
feedWrapper.appendChild(sentinel);

const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        loadMorePosts();
    }
}, {
    rootMargin: '100px' 
});

observer.observe(sentinel);

loadMorePosts();