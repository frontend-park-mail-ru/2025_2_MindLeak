let inputTemplate: Handlebars.TemplateDelegate | null = null;

interface InputProps {
    type?: string;
    placeholder?: string;
    name?: string;
}

async function getInputTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (inputTemplate) return inputTemplate;

    const res = await fetch('/components/Input/Input.hbs');
    const source = await res.text();
    inputTemplate = Handlebars.compile(source);
    return inputTemplate;
}

export class Input {
    private type: string;
    private placeholder: string;
    private name: string;

    constructor({ type = 'text', placeholder = '', name = '' }: InputProps) {
        this.type = type;
        this.placeholder = placeholder;
        this.name = name;
    }

    async render(): Promise<HTMLElement> {
        const template = await getInputTemplate();
        const html = template({
            type: this.type,
            placeholder: this.placeholder,
            name: this.name
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        
        const inputElement = div.firstElementChild as HTMLElement;
        if (!inputElement) {
            throw new Error('Input element not found');
        }
        
        return inputElement;
    }
}
