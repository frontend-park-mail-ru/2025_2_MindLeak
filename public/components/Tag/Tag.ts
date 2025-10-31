/**
 * Кэшированный шаблон тега
 */
let tagTemplate: Handlebars.TemplateDelegate | null = null;

/**
 * Интерфейс для свойств тега
 */
interface TagProps {
    icon: string;
    count?: number;
    key?: string;
}

/**
 * Асинхронно загружает шаблон тега
 * @returns {Promise<Handlebars.TemplateDelegate>} - скомпилированный Handlebars-шаблон тега
 */
async function getTagTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (tagTemplate) return tagTemplate;

    const res = await fetch('/components/Tag/Tag.hbs');
    const source = await res.text();
    tagTemplate = Handlebars.compile(source);
    return tagTemplate;
}

/**
 * Класс для рендеринга тега
 */
export class Tag {
    private icon: string;
    private count: number;
    private key: string;

    constructor({ icon, count = 0, key = '' }: TagProps) {
        this.icon = icon;
        this.count = count;
        this.key = key;
    }

    /**
     * Рендерит тег
     * @returns {Promise<HTMLElement>} - DOM-элемент тега
     */
    async render(): Promise<HTMLElement> {
        const template = await getTagTemplate();
        const html = template(this);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        
        const tagElement = div.firstElementChild as HTMLElement;
        if (!tagElement) {
            throw new Error('Tag element not found');
        }
        
        return tagElement;
    }
}