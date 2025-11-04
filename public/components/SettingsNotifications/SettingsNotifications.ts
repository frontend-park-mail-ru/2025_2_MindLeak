let settingsNotificationsTemplate: Handlebars.TemplateDelegate | null = null;

interface SettingsNotificationsProps {
    // потом
}

async function getSettingsNotificationsTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (settingsNotificationsTemplate) return settingsNotificationsTemplate;

    const res = await fetch('/components/SettingsNotifications/SettingsNotifications.hbs');
    const source = await res.text();
    settingsNotificationsTemplate = Handlebars.compile(source);
    return settingsNotificationsTemplate;
}

export class SettingsNotifications {
    private props: SettingsNotificationsProps;

    constructor(props: SettingsNotificationsProps = {}) {
        this.props = props;
    }

    async render(): Promise<HTMLElement> {
        const template = await getSettingsNotificationsTemplate();
        const html = template(this.props);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const settingsNotificationsElement = div.firstElementChild as HTMLElement;
        
        if (!settingsNotificationsElement) {
            throw new Error('SettingsNotifications element not found');
        }

        return settingsNotificationsElement;
    }
}