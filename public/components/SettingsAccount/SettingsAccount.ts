let settingsAccountTemplate: Handlebars.TemplateDelegate | null = null;

interface SettingsAccountProps {
    userData?: {
        name: string;
        phone: string;
        email: string;
        created_at: string;
        country: string;
        language: string;
        sex: string;
        date_of_birth: string;
        age?: number;
    };
}

async function getSettingsAccountTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (settingsAccountTemplate) return settingsAccountTemplate;

    const res = await fetch('/components/SettingsAccount/SettingsAccount.hbs');
    const source = await res.text();
    settingsAccountTemplate = Handlebars.compile(source);
    return settingsAccountTemplate;
}

export class SettingsAccount {
    private props: SettingsAccountProps;

    constructor(props: SettingsAccountProps = {}) {
        this.props = props;
    }

    async render(): Promise<HTMLElement> {
        const template = await getSettingsAccountTemplate();
        
        const formattedData = this.formatUserData(this.props.userData);
        
        const html = template(formattedData);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const settingsAccountElement = div.firstElementChild as HTMLElement;
        
        if (!settingsAccountElement) {
            throw new Error('SettingsAccount element not found');
        }

        this.attachEditButtonListener(settingsAccountElement);
        this.attachDeleteButtonListener(settingsAccountElement);
        return settingsAccountElement;
    }

    private formatUserData(userData?: SettingsAccountProps['userData']) {
        if (!userData) {
            return {
                name: 'Не указано',
                phone: 'Не указано',
                email: 'Не указано',
                created_at: 'Не указано',
                country: 'Россия',
                language: 'Русский',
                sex: 'Не указано',
                date_of_birth: 'Не указано',
                age: 'Не указано'
            };
        }

        let formattedDate = 'Не указано';
        if (userData.created_at) {
            const date = new Date(userData.created_at);
            formattedDate = date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }) + ', ' + date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        let formattedBirthDate = 'Не указано';
        let age = 'Не указано';
        if (userData.date_of_birth) {
            const birthDate = new Date(userData.date_of_birth);
            formattedBirthDate = birthDate.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
            }
            age = calculatedAge.toString();
        }

        let formattedSex = userData.sex;
        if (userData.sex === 'male') formattedSex = 'Мужской';
        if (userData.sex === 'female') formattedSex = 'Женский';
        if (userData.sex === 'other') formattedSex = 'Другой';

        return {
            name: userData.name || 'Не указано',
            phone: userData.phone || 'Не указано',
            email: userData.email || 'Не указано',
            created_at: formattedDate,
            country: userData.country || 'Россия',
            language: userData.language || 'Русский',
            sex: formattedSex,
            date_of_birth: formattedBirthDate,
            age: age
        };
    }

    private attachEditButtonListener(container: HTMLElement): void {
        const editButton = container.querySelector('.settings-account__edit-button') as HTMLButtonElement;
        if (editButton) {
            editButton.addEventListener('click', () => {
                const event = new CustomEvent('editAccountRequest');
                container.dispatchEvent(event);
            });
        }
    }

    private attachDeleteButtonListener(container: HTMLElement): void {
        const deleteButton = container.querySelector('.settings-account__delete-button') as HTMLButtonElement;
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                const event = new CustomEvent('deleteAccountRequest');
                container.dispatchEvent(event);
            });
        }
    }

}