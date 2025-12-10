let settingsPrivacyTemplate: Handlebars.TemplateDelegate | null = null;

interface SettingsPrivacyProps {
    // потом
}

async function getSettingsPrivacyTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (settingsPrivacyTemplate) return settingsPrivacyTemplate;

    const res = await fetch('/components/SettingsPrivacy/SettingsPrivacy.hbs');
    const source = await res.text();
    settingsPrivacyTemplate = Handlebars.compile(source);
    return settingsPrivacyTemplate;
}

export class SettingsPrivacy {
    private props: SettingsPrivacyProps;

    constructor(props: SettingsPrivacyProps = {}) {
        this.props = props;
    }

    async render(): Promise<HTMLElement> {
        const template = await getSettingsPrivacyTemplate();
        const html = template(this.props);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const settingsPrivacyElement = div.firstElementChild as HTMLElement;
        
        if (!settingsPrivacyElement) {
            throw new Error('SettingsPrivacy element not found');
        }

        return settingsPrivacyElement;
    }
}
