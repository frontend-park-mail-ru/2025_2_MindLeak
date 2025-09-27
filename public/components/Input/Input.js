let inputTemplate = null;

async function getInputTemplate() {
    if (inputTemplate) return inputTemplate;

    const res = await fetch('/components/Input/input.hbs');
    const source = await res.text();
    inputTemplate = Handlebars.compile(source);
    return inputTemplate;
}

export class Input {
    constructor({ type = 'text', placeholder = '', name = '' }) {
        this.type = type;
        this.placeholder = placeholder;
        this.name = name;
    }

  async render() {
        const template = await getInputTemplate();
        const html = template(this);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        return div.firstElementChild;
  }
}