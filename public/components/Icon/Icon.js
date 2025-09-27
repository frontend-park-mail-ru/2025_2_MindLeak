let iconTemplate = null;

async function getIconTemplate() {
  if (iconTemplate) return iconTemplate;

  const res = await fetch('/components/Icon/Icon.hbs');
  const source = await res.text();
  iconTemplate = Handlebars.compile(source);
  return iconTemplate;
}

export class Icon {
  constructor({ 
    src, 
    key = '', 
    className = '', 
    title = '',
    size = 'medium', // small, medium, large
    customStyle = '' 
  }) {
    this.src = src;
    this.key = key;
    this.className = className;
    this.title = title;
    this.customStyle = customStyle;
    
    if (size === 'small') {
      this.className += ' icon--small';
    } else if (size === 'large') {
      this.className += ' icon--large';
    }
  }

  async render() {
    const template = await getIconTemplate();
    const html = template(this);

    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }
}