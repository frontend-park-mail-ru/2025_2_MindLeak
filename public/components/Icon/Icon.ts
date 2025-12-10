let iconTemplate: Handlebars.TemplateDelegate | null = null;

type IconSize = 'small' | 'medium' | 'large';

interface IconProps {
    src: string;
    key?: string;
    className?: string;
    title?: string;
    size?: IconSize;
    customStyle?: string;
}

async function getIconTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (iconTemplate) return iconTemplate;

    const res = await fetch('/components/Icon/Icon.hbs');
    const source = await res.text();
    iconTemplate = Handlebars.compile(source);
    return iconTemplate;
}

export class Icon {
    private src: string;
    private key: string;
    private className: string;
    private title: string;
    private customStyle: string;

    constructor({ 
        src, 
        key = '', 
        className = '', 
        title = '',
        size = 'medium',
        customStyle = '' 
    }: IconProps) {
        this.src = src;
        this.key = key;
        this.className = className;
        this.title = title;
        this.customStyle = customStyle;
        
        // добав класс размера
        if (size === 'small') {
            this.className += ' icon--small';
        } else if (size === 'large') {
            this.className += ' icon--large';
        }
    }

    async render(): Promise<HTMLElement> {
        const template = await getIconTemplate();
        const html = template({
            src: this.src,
            key: this.key,
            className: this.className,
            title: this.title,
            customStyle: this.customStyle
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        
        const iconElement = div.firstElementChild as HTMLElement;
        if (!iconElement) {
            throw new Error('Icon element not found');
        }
        
        return iconElement;
    }
}
