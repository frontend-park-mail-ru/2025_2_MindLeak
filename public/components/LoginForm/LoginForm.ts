let loginTemplate: Handlebars.TemplateDelegate | null = null;

async function getLoginTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (loginTemplate) return loginTemplate;

    const inputRes = await fetch('/components/Input/Input.hbs');
    const inputSource = await inputRes.text();
    Handlebars.registerPartial('input', Handlebars.compile(inputSource));

    const buttonRes = await fetch('/components/FormButton/FormButton.hbs');
    const buttonSource = await buttonRes.text();
    Handlebars.registerPartial('button', Handlebars.compile(buttonSource));

    const res = await fetch('/components/LoginForm/LoginForm.hbs');
    const source = await res.text();
    loginTemplate = Handlebars.compile(source);
    return loginTemplate;
}

export class LoginForm {
    async render(): Promise<HTMLElement> {
        const template = await getLoginTemplate();
        
        const html = template({});

        const div = document.createElement('div');
        div.innerHTML = html.trim();

        const modal = div.firstElementChild as HTMLElement;
        if (!modal) {
            throw new Error('Modal element not found');
        }

        modal.addEventListener('click', (e: Event) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }

    getFormElement(container: HTMLElement): HTMLFormElement | null {
        return container.querySelector('.login-form__body');
    }

    getSignUpLink(container: HTMLElement): HTMLAnchorElement | null {
        return container.querySelector('.login-form__footer .link');
    }
}
