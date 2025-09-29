let buttonTemplate = null;

async function getButtonTemplate() {
    if (buttonTemplate) return buttonTemplate;

    const res = await fetch('/components/FormButton/FormButton.hbs');
    const source = await res.text();
    buttonTemplate = Handlebars.compile(source);
    return buttonTemplate;
}

export class Button {
    constructor({ text, key = '' }) {
        this.text = text;
        this.key = key;
    }

    async render() {
        const template = await getButtonTemplate(); 
        const html = template(this);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        return div.firstElementChild;
    }
}