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



/*
const config = {
    menu:{
        login: {
            text: 'Вход',
            render: renderLogin,
        }
    }
}

const state = {
    activeMenuLink: null,
};


Object.entries(config.menu).forEach(async ([key, {text}], index) => {  // убрать асинк потому что параша
    // Создаем кнопку через компонент Button
    const button = await new Button({ 
        text: text,
        type: 'button'
    }).render();
    
    button.dataset.section = key;
    button.classList.add('menu-button'); // добавляем класс для меню

    if (index === 0){
        button.classList.add('active');
        state.activeMenuLink = button;
    }

    menuContainer.appendChild(button);
}); */

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

async function renderPost(postData) {
    const postCard = new PostCard(postData);
    return await postCard.render();
}

async function loadMorePosts() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < POSTS_PER_LOAD; i++) {
        const postIndex = virtualPostIndex % mockPosts.length;
        const postData = { ...mockPosts[postIndex], id: virtualPostIndex + 1 };
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

/*
function renderFeed() {
    const feed = document.createElement('div');

    return feed;
}

menuContainer.addEventListener('click', async (e) => {
    const {target} = e;

    if (target.tagName.toLowerCase() === 'button' || target instanceof HTMLAnchorElement ) { 
        e.preventDefault();

        const section = target.dataset.section;
        
        state.activeMenuLink.classList.remove('active');
        e.target.classList.add('active');
        state.activeMenuLink = target;



        if (section === 'login') {
            // Для логина — открываем модалку поверх всего
            const loginForm = new LoginForm();
            const modal = await loginForm.render();
            document.body.appendChild(modal); //  добавляем в body
        } else if (section === 'signUp') {
            const signUpForm = new SignUpForm();
            const modal = await signUpForm.render();
            document.body.appendChild(modal);
        } else {
            // Для остальных — как раньше
            pageElement.innerHTML = '';
            const element = await config.menu[section].render();
            pageElement.appendChild(element);
        }
    }
});
*/