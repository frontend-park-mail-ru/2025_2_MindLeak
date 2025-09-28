import { Header } from '/components/Header/Header.js';
import { Button } from '/components/FormButton/FormButton.js';
import { Input } from '/components/Input/Input.js';
import { LoginForm } from '/components/LoginForm/LoginForm.js';
import { SignUpForm } from '/components/SignUpForm/SignUpForm.js';
import { PostCard } from '/components/PostCard/PostCard.js';
import { mockPosts } from '/data/mockPosts.js';

const rootElem = document.getElementById('root');
const headerContainer = document.createElement('header');
const menuContainer = document.createElement('aside'); // элемент aside -меню (left)
const pageElement = document.createElement('main'); // основное место куда будем встраивать (right)
rootElem.appendChild(headerContainer);
rootElem.appendChild(menuContainer);
rootElem.appendChild(pageElement);

(async () => {
    const header = new Header({ LoginForm });
    const headerEl = await header.render();
    headerContainer.appendChild(headerEl);
})();


async function renderLogin() {
  const loginForm = new LoginForm();
  return await loginForm.render();
}

async function renderSignUp() {
  const signUpForm = new SignUpForm();
  return await signUpForm.render();
}

const feedContainer = document.createElement('div');
feedContainer.className = 'feed';
pageElement.appendChild(feedContainer);

let virtualPostIndex = 0;
const POSTS_PER_LOAD = 3;

async function fetchPosts() {
    try {
        const res = await fetch('http://62.109.19.84:90/api/feed');
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
let loadedPosts = 0; 

async function loadMorePosts() {
    if (allPosts.length === 0) {
        const rawPosts = await fetchPosts();
        allPosts = rawPosts.map(transformPost);
    }

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < POSTS_PER_LOAD; i++) {
        if (loadedPosts >= allPosts.length) break;
        
        const postEl = await renderPost(allPosts[loadedPosts]);
        fragment.appendChild(postEl);
        loadedPosts++;
    }

    if (fragment.childElementCount > 0) {
        feedContainer.insertBefore(fragment, sentinel);
    } else {
        observer.unobserve(sentinel);
    }
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