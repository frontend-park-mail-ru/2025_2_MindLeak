export interface OfflineWarningProps {
    title?: string;
    message?: string;
    requestedId?: string;
    onReload?: () => void;
    onBack?: () => void;
}

let offlineWarningTemplate: Handlebars.TemplateDelegate | null = null;

async function getOfflineWarningTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (offlineWarningTemplate) return offlineWarningTemplate;
    
    const res = await fetch('/components/OfflineWarning/OfflineWarning.hbs');
    const source = await res.text();
    offlineWarningTemplate = Handlebars.compile(source);
    return offlineWarningTemplate;
}

export class OfflineWarning {
    private props: OfflineWarningProps;
    
    constructor(props: OfflineWarningProps = {}) {
        this.props = {
            title: props.title || 'Страница недоступна оффлайн',
            message: props.message || 'Контент не был сохранён для просмотра без интернета.',
            requestedId: props.requestedId,
            onReload: props.onReload,
            onBack: props.onBack
        };
    }
    
    async render(): Promise<HTMLElement> {
        const template = await getOfflineWarningTemplate();
        const html = template({
            title: this.props.title,
            message: this.props.message,
            requestedId: this.props.requestedId
        });
        
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const element = div.firstElementChild as HTMLElement;
        
        if (!element) {
            throw new Error('OfflineWarning element not found');
        }
        
        this.attachEventListeners(element);
        return element;
    }
    
    private attachEventListeners(element: HTMLElement): void {
        const reloadBtn = element.querySelector('[data-action="reload"]');
        const backBtn = element.querySelector('[data-action="back"]');
        
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                if (this.props.onReload) {
                    this.props.onReload();
                } else {
                    location.reload();
                }
            });
        }
        
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (this.props.onBack) {
                    this.props.onBack();
                } else {
                    history.back();
                }
            });
        }
    }
}