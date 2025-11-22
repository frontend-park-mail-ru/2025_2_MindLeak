const BASE_URL = 'https://mindleak.ru/api';

//Интерфейс для стандартизированного ответа API
export interface ApiResponse {
    status: number;
    data?: any;
    message?: string;
}

class Ajax {
    /*
    todo РАССКОМИТИТЬ ДЛЯ ДЕПЛОЯ
    private getCookie(name: string): string | null {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()!.split(";").shift() || null;
        return null;
    }*/

    private async request(url: string, options: RequestInit = {}): Promise<ApiResponse> {
        try {
            const fullUrl = `${BASE_URL}${url}`;

            /*
            todo РАССКОМИТИТЬ ДЛЯ ДЕПЛОЯ
            // Получаем CSRF токен из куки
            const csrfToken = this.getCookie('csrf_token');
            
            // Базовые заголовки*/
            const headers: Record<string, string> = {};
            
            if (!(options.body instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
            }
            
            /*
            todo РАССКОМИТИТЬ ДЛЯ ДЕПЛОЯ
            // Добавляем CSRF токен для всех не-GET запросов
            if (options.method && options.method !== 'GET' && options.method !== 'HEAD') {
                if (csrfToken) {
                    headers['X-CSRF-Token'] = csrfToken;
                }
                console.warn('No CSRF token found for non-GET request');
            }*/

            const response = await fetch(fullUrl, {
                headers: {
                    ...headers,
                    ...options.headers,
                },
                credentials: 'include', // куки
                ...options
            });

            const contentType = response.headers.get('content-type');
            let data: any = null;

            if (contentType && contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch (parseError) {
                    
                }
            }

            const result: ApiResponse = {
                status: response.status,
                data: data,
                message: response.statusText
            };

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

    async put(url: string, body?: any): Promise<ApiResponse> {
        return this.request(url, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined
        });
    }

    async delete(url: string, body?: any): Promise<ApiResponse> {
        return this.request(url, {
            method: 'DELETE',
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
        return this.get('/logout');
    }

    getFeed(filter?: string, offset: number = 0): Promise<any> {
        if (filter) {
            const url = `/feed/category?topic=${encodeURIComponent(filter)}&offset=${offset}`;
            return this.get(url);
        } else {
            const url = `/feed?offset=${offset}`;
            return this.get(url);
        }
    }

    async createPost(postData: { title: string; content: string; topic_id?: number }): Promise<ApiResponse> {
        return this.post('/posts', postData);
    }

    async deletePost(postId: string): Promise<ApiResponse> {
        return this.delete(`/posts/${postId}`);
    }

    async deleteAccount(): Promise<ApiResponse> {
        return this.delete('/profile/delete');
    }

    async editPost(postId: string, postData: { title: string; content: string; topic_id?: number }): Promise<ApiResponse> {
        return this.put(`/posts/${postId}`, postData);
    }

    async uploadAvatar(formData: FormData): Promise<ApiResponse> {
        return this.request('/uploads/avatar', {
            method: 'POST',
            body: formData
        });
    }

    async deleteAvatar(): Promise<ApiResponse> {
        return this.request('/delete/avatar', {
            method: 'DELETE'
        });
    }

    async uploadCover(formData: FormData): Promise<ApiResponse> {
        return this.request('/uploads/cover', {
            method: 'POST',
            body: formData
        });
    }

    async deleteCover(): Promise<ApiResponse> {
        return this.request('/delete/cover', {
            method: 'DELETE'
        });
    }
    // Добавляем методы для работы с обращениями в поддержку
    async submitAppeal(appealData: {
        email_registered: string;
        status: string;
        name: string;
        problem_description: string;
        category_id: string;
        email_for_connection: string;
        screenshot_url: string;
    }): Promise<ApiResponse> {
        console.log('📤 Sending appeal to backend:', appealData);
        return this.post('/appeal', appealData);
    }

    async getAppeals(): Promise<ApiResponse> {
        return this.get('/appeals');
    }

    async uploadSupportFile(formData: FormData): Promise<ApiResponse> {
        return this.request('/appeals/uploads', {
            method: 'POST',
            body: formData
        });
    }
}

export const ajax = new Ajax();
export default ajax;