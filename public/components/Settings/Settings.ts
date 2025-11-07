let settingsTemplate: Handlebars.TemplateDelegate | null = null;

interface SettingsProps {
    // наверное и не будет
}

async function getSettingsTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (settingsTemplate) return settingsTemplate;

    const res = await fetch('/components/Settings/Settings.hbs');
    const source = await res.text();
    settingsTemplate = Handlebars.compile(source);
    return settingsTemplate;
}

export class Settings {
    private props: SettingsProps;

    constructor(props: SettingsProps = {}) {
        this.props = props;
    }

    async render(): Promise<HTMLElement> {
        const template = await getSettingsTemplate();
        const html = template(this.props);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const settingsMainElement = div.firstElementChild as HTMLElement;
        
        if (!settingsMainElement) {
            throw new Error('Settings element not found');
        }

        return settingsMainElement;
    }
}
