let tagTemplate = null;

async function getTagTemplate() {
  if (tagTemplate) return tagTemplate;

  const res = await fetch('/components/Tag/Tag.hbs');
  const source = await res.text();
  tagTemplate = Handlebars.compile(source);
  return tagTemplate;
}

export class Tag {
  constructor({ icon, count = 0, key = '' }) {
    this.icon = icon;
    this.count = count;
    this.key = key;
  }

  async render() {
    const template = await getTagTemplate();
    const html = template(this);

    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }
}