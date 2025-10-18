let userMenuTemplate = null;

async function getUserMenuTemplate() {
    if (userMenuTemplate) return userMenuTemplate;

    const res = await fetch('/components/UserMenu/UserMenu.hbs');
    const source = await res.text();
    userMenuTemplate = Handlebars.compile(source);
    return userMenuTemplate;
}

export class UserMenu {
    constructor({ name = 'Аккаунт', subtitle = 'тема', avatar = null, isSubscribed = false }) {
        this.name = name;
        this.subtitle = subtitle;
        this.avatar = avatar;
        this.isSubscribed = isSubscribed;
    }

    async render() {
        const template = await getUserMenuTemplate();
        const html = template({
            name: this.name,
            subtitle: this.subtitle,
            avatar: this.avatar,
            isSubscribed: this.isSubscribed
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const userMenu = div.firstElementChild;

        const button = userMenu.querySelector('.user-menu__button');
        if (button) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isSubscribed) {
                    console.log('Выход из аккаунта...');
                    window.location.href = '/logout';
                } else {
                    console.log('Показываем форму входа...');
                    import('../LoginForm/LoginForm.js').then(({ LoginForm }) => {
                        new LoginForm().render().then(modal => {
                            document.body.appendChild(modal);
                        });
                    });
                }
            });
        }

        return userMenu;
    }
}