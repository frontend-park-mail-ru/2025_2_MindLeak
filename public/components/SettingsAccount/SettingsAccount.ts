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
        avatar_url?: string;
        cover_url?: string;
    };
    isLoading?: boolean;
    error?: string | null;
    isUploadingAvatar?: boolean;
    isUploadingCover?: boolean;
}

async function getSettingsAccountTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (settingsAccountTemplate) return settingsAccountTemplate;

    const inputRes = await fetch('/components/Input/Input.hbs');
    const inputSource = await inputRes.text();
    Handlebars.registerPartial('input', Handlebars.compile(inputSource));

    const res = await fetch('/components/SettingsAccount/SettingsAccount.hbs');
    const source = await res.text();
    
    Handlebars.registerHelper('eq', function(a, b) {
        return a === b;
    });

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
        
        // Создаем объект userData с timestamp'ами
        const userDataWithCacheBust = this.props.userData ? {
            ...this.props.userData,
            // Добавляем timestamp к URL аватара и обложки
            avatar_url: this.props.userData.avatar_url ? 
                `${this.props.userData.avatar_url}${this.props.userData.avatar_url.includes('?') ? '&' : '?'}nocache=${Date.now()}` :
                '',
            cover_url: this.props.userData.cover_url ?
                `${this.props.userData.cover_url}${this.props.userData.cover_url.includes('?') ? '&' : '?'}nocache=${Date.now()}` :
                ''
        } : null;
        
        const templateData = {
            ...formattedData,
            // Передаем avatar_url и cover_url на верхнем уровне для совместимости
            avatar_url: userDataWithCacheBust?.avatar_url || '',
            cover_url: userDataWithCacheBust?.cover_url || '',
            // Передаем полный объект userData с обновленными URL
            userData: userDataWithCacheBust,
            isLoading: this.props.isLoading || false,
            error: this.props.error || null,
            isUploadingAvatar: this.props.isUploadingAvatar || false,
            isUploadingCover: this.props.isUploadingCover || false 
        };
        
        const html = template(templateData);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const settingsAccountElement = div.firstElementChild as HTMLElement;
        
        if (!settingsAccountElement) {
            throw new Error('SettingsAccount element not found');
        }

        return settingsAccountElement;
    }

    private formatUserData(userData?: SettingsAccountProps['userData']) {
        if (!userData) {
            return {
                name: '',
                phone: '',
                email: 'Не указано',
                created_at: 'Не указано',
                country: 'Россия',
                language: 'Русский',
                sex: 'other',
                date_of_birth: '',
                age: 'Не указано',
                avatar_url: '',
                cover_url: ''
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

        let formattedBirthDate = userData.date_of_birth || '';
        let age = 'Не указано';
        if (userData.date_of_birth) {
            const birthDate = new Date(userData.date_of_birth);
            
            // Проверяем, не является ли это специальной датой 01.01.0001
            if (birthDate.getFullYear() === 1 && 
                birthDate.getMonth() === 0 && 
                birthDate.getDate() === 1) {
                // Оставляем специальную дату как есть
                formattedBirthDate = '0001-01-01';
                age = 'Не указано';
            } else {
                // Нормальная дата рождения
                formattedBirthDate = birthDate.toISOString().split('T')[0];
                
                const today = new Date();
                let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    calculatedAge--;
                }
                age = calculatedAge.toString();
            }
        }

        let formattedSex = userData.sex;
        if (userData.sex === 'male') formattedSex = 'male';
        if (userData.sex === 'female') formattedSex = 'female';
        if (userData.sex === 'other') formattedSex = 'other';

        return {
            name: userData.name || '',
            phone: userData.phone || '',
            email: userData.email || 'Не указано',
            created_at: formattedDate,
            country: userData.country || 'Россия',
            language: userData.language || 'Русский',
            sex: formattedSex,
            date_of_birth: formattedBirthDate,
            age: age,
            avatar_url: userData.avatar_url || '',
            cover_url: userData.cover_url || '' 
        };
    }
}
