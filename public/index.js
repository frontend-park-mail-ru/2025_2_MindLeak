import { Header } from '/components/Header/Header.js';
import { LoginForm } from '/components/LoginForm/LoginForm.js';
import { PostCard } from '/components/PostCard/PostCard.js';
import { mockPosts } from '/data/mockPosts.js';

const rootElem = document.getElementById('root');
const headerContainer = document.createElement('header');
const menuContainer = document.createElement('aside');
const pageElement = document.createElement('main');
rootElem.appendChild(headerContainer);
rootElem.appendChild(menuContainer);
rootElem.appendChild(pageElement);

(async () => {
    const header = new Header({ LoginForm });
    const headerEl = await header.render();
    headerContainer.appendChild(headerEl);
})();

const feedContainer = document.createElement('div');
feedContainer.className = 'feed';
pageElement.appendChild(feedContainer);

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
            { key: 'tag1', icon: '/img/icons/js.svg', count: 'тег1' },
            { key: 'tag2', icon: '/img/icons/web.svg', count: 'тег2' }
        ],
        commentsCount: '0',
        repostsCount: '0',
        viewsCount: '0'
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

    feedContainer.insertBefore(fragment, sentinel);
}

const sentinel = document.createElement('div');
sentinel.style.height = '20px';
feedContainer.appendChild(sentinel);

const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        loadMorePosts();
    }
}, {
    rootMargin: '100px' 
});

observer.observe(sentinel);

loadMorePosts();