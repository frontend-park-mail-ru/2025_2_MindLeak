let buttonTemplate: Handlebars.TemplateDelegate | null = null;

interface ButtonProps {
    text: string;
    key?: string;
}

async function getButtonTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (buttonTemplate) return buttonTemplate;

    const res = await fetch('/components/FormButton/FormButton.hbs');
    const source = await res.text();
    buttonTemplate = Handlebars.compile(source);
    return buttonTemplate;
}

export class Button {
    private text: string;
    private key: string;

    constructor({ text, key = '' }: ButtonProps) {
        this.text = text;
        this.key = key;
    }

    async render(): Promise<HTMLElement> {
        const template = await getButtonTemplate();
        const html = template({
            text: this.text,
            key: this.key
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        
        const buttonElement = div.firstElementChild as HTMLElement;
        if (!buttonElement) {
            throw new Error('Button element not found');
        }
        
        return buttonElement;
    }
}
