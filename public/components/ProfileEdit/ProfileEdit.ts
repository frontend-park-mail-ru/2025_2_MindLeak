let editProfileTemplate: Handlebars.TemplateDelegate | null = null;

interface EditProfileFormProps {
    settings: any;
    isLoading: boolean;
    error: string | null;
}

async function getEditProfileTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (editProfileTemplate) return editProfileTemplate;

    const inputRes = await fetch('/components/Input/Input.hbs');
    const inputSource = await inputRes.text();
    Handlebars.registerPartial('input', Handlebars.compile(inputSource));

    const buttonRes = await fetch('/components/FormButton/FormButton.hbs');
    const buttonSource = await buttonRes.text();
    Handlebars.registerPartial('button', Handlebars.compile(buttonSource));

    const res = await fetch('/components/ProfileEdit/ProfileEdit.hbs');
    const source = await res.text();
    
    // хелпер для сравнения в hbs
    Handlebars.registerHelper('eq', function(a, b) {
        return a === b;
    });

    editProfileTemplate = Handlebars.compile(source);
    return editProfileTemplate;
}

export class ProfileEdit {
    private props: EditProfileFormProps;

    constructor(props: EditProfileFormProps) {
        this.props = props;
    }

    async render(): Promise<HTMLElement> {
        const template = await getEditProfileTemplate();
        const html = template(this.props);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const formElement = div.firstElementChild as HTMLElement;
        
        if (!formElement) {
            throw new Error('Edit profile form element not found');
        }

        return formElement;
    }
}