const BASE_URL = 'https://mindleak.ru/api';

//Интерфейс для стандартизированного ответа API
export interface ApiResponse {
    status: number;
    data?: any;
    message?: string;
}

class Ajax {
    private async request(url: string, options: RequestInit = {}): Promise<ApiResponse> {
        try {
            const fullUrl = `${BASE_URL}${url}`;
            console.log(`AJAX Making request to: ${fullUrl}`, options);

            const response = await fetch(fullUrl, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                credentials: 'include', //куки
                ...options
            });

            const contentType = response.headers.get('content-type');
            let data: any = null;

            if (contentType && contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch (parseError) {
                    console.warn(`AJAX Failed to parse JSON from ${url}:`, parseError);
                }
            }

            const result: ApiResponse = {
                status: response.status,
                data: data,
                message: response.statusText
            };

            console.log(`AJAX Response from ${url}:`, result);
            return result;

        } catch (error) {
            console.error(`AJAX Network error for ${url}:`, error);
            return {
                status: 0,
                message: 'Ошибка соединения с интернетом 😭'
            };
        }
    }

    async get(url: string): Promise<ApiResponse> {
        return this.request(url);
    }

    async post(url: string, body?: any): Promise<ApiResponse> {
        return this.request(url, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined
        });
    }

    async getMe(): Promise<ApiResponse> {
        return this.get('/me');
    }

    async login(credentials: { email: string; password: string }): Promise<ApiResponse> {
        return this.post('/login', credentials);
    }

    async register(userData: { name: string; email: string; password: string }): Promise<ApiResponse> {
        return this.post('/registration', userData);
    }

    async logout(): Promise<ApiResponse> {
        return this.post('/logout');
    }

    async getFeed(): Promise<ApiResponse> {
        return this.get('/feed');
    }
}

// todo форма записи 
export const ajax = new Ajax();
export default ajax;