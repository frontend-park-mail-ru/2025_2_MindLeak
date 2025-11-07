let signUpTemplate: Handlebars.TemplateDelegate | null = null;

async function getSignUpTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (signUpTemplate) return signUpTemplate;

    const inputRes = await fetch('/components/Input/Input.hbs');
    const inputSource = await inputRes.text();
    Handlebars.registerPartial('input', Handlebars.compile(inputSource));

    const buttonRes = await fetch('/components/FormButton/FormButton.hbs');
    const buttonSource = await buttonRes.text();
    Handlebars.registerPartial('button', Handlebars.compile(buttonSource));

    const res = await fetch('/components/SignUpForm/SignUpForm.hbs');
    const source = await res.text();
    signUpTemplate = Handlebars.compile(source);
    return signUpTemplate;
}

export class SignUpForm {
    async render(): Promise<HTMLElement> {
        const template = await getSignUpTemplate();

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
        return container.querySelector('.registration-form__body');
    }

    getLoginLink(container: HTMLElement): HTMLAnchorElement | null {
        return container.querySelector('.registration-form__footer .link');
    }
}
