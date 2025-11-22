import { Icon } from '../Icon/Icon';

export class ErrorButton {
    private element: HTMLElement | null = null;

    constructor(private onClick: () => void) {}

    async render(): Promise<HTMLElement> {
        const wrapper = document.createElement('div');
        wrapper.className = 'error-button-wrapper';

        const icon = new Icon({
            src: '/img/icons/error.svg',
            className: 'error-button-icon',
            title: 'Сообщить об ошибке'
        });

        const iconEl = await icon.render();
        wrapper.appendChild(iconEl);
        wrapper.addEventListener('click', this.onClick);

        this.element = wrapper;
        return wrapper;
    }

    destroy(): void {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}