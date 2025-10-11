/**
 * Кэшированный шаблон кнопки
 */
let buttonTemplate: Handlebars.TemplateDelegate | null = null;

/**
 * Интерфейс для свойств кнопки
 */
interface ButtonProps {
    text: string;
    key?: string;
}

/**
 * Асинхронно загружает шаблон кнопки
 * @returns {Promise<Handlebars.TemplateDelegate>} - скомпилированный Handlebars-шаблон кнопки
 */
async function getButtonTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (buttonTemplate) return buttonTemplate;

    const res = await fetch('/components/FormButton/FormButton.hbs');
    const source = await res.text();
    buttonTemplate = Handlebars.compile(source);
    return buttonTemplate;
}

/**
 * Класс для рендеринга кнопки
 */
export class Button {
    private text: string;
    private key: string;

    constructor({ text, key = '' }: ButtonProps) {
        this.text = text;
        this.key = key;
    }

    /**
     * Рендерит кнопку
     * @returns {Promise<HTMLElement>} - DOM-элемент кнопки
     */
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