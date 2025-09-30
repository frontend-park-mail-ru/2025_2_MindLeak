let popUpMenuTemplate = null;

async function getPopUpMenuTemplate() {
    if (popUpMenuTemplate) return popUpMenuTemplate;

    // Регистрируем partials
    const userMenuRes = await fetch('/components/UserMenu/UserMenu.hbs');
    const userMenuSource = await userMenuRes.text();
    Handlebars.registerPartial('user-menu', Handlebars.compile(userMenuSource));

    const menuItemRes = await fetch('/components/MenuItem/MenuItem.hbs');
    const menuItemSource = await menuItemRes.text();
    Handlebars.registerPartial('menu-item', Handlebars.compile(menuItemSource));

    const res = await fetch('/components/PopUpMenu/PopUpMenu.hbs');
    const source = await res.text();
    popUpMenuTemplate = Handlebars.compile(source);
    return popUpMenuTemplate;
}

export class PopUpMenu {
    constructor({ user, menuItems }) {
        this.user = user;
        this.menuItems = menuItems || [
            { key: 'bookmarks', icon: '/img/icons/bookmark.svg', text: 'Черновики' },
            { key: 'saved', icon: '/img/icons/folder.svg', text: 'Закладки' },
            { key: 'settings', icon: '/img/icons/settings.svg', text: 'Настройки' },
            { key: 'subscription', icon: '/img/icons/diamond.svg', text: 'Подписка' },
            { key: 'logout', icon: '/img/icons/logout.svg', text: 'Выйти' }
        ];
    }

    async render() {
        const template = await getPopUpMenuTemplate();
        const html = template({
            user: this.user,
            menuItems: this.menuItems
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const popUpMenu = div.firstElementChild; // <div class="popUp-menu">

        // === Обработчики кликов по пунктам меню ===
        const menuItems = popUpMenu.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const key = item.dataset.key;

                console.log(`[PopUpMenu] Клик по пункту: ${key}`);

                // 🔥 Закрываем меню — удаляем его из DOM
                if (popUpMenu.parentNode) {
                    popUpMenu.remove();
                }

                // 🚪 Для "Выход" — делаем logout (заглушка)
                if (key === 'logout') {
                    handleLogout();
                }

                // 💡 Остальные пункты — можно позже добавить навигацию
                // например: window.location.href = `/${key}`;
            });
        });

        // === Обработчик клика по самому контейнеру (чтобы не закрывалось при клике внутри) ===
        popUpMenu.addEventListener('click', (e) => {
            e.stopPropagation(); // не даем событию всплывать до body
        });

        return popUpMenu;
    }
}

// 🔐 Заглушка для выхода — как в LoginForm
function handleLogout() {
    console.log('Попытка выхода...');
    try {
        // Отправляем запрос на /logout
        fetch('/logout', { method: 'POST' })
            .then(res => {
                if (res.ok) {
                    console.log('Выход успешен!');
                    window.location.reload(); // перезагружаем страницу — чтобы обновился Header
                } else {
                    console.error('Ошибка при выходе:', res.status);
                }
            })
            .catch(err => {
                console.error('Сеть недоступна:', err);
                alert('Не удалось выйти. Проверьте подключение.');
            });
    } catch (err) {
        console.error('Ошибка выхода:', err);
        alert('Произошла ошибка при выходе.');
    }
}