import { api } from '../api/api';

type Callback = (payload: any) => void;

class Dispatcher {
    private callbacks: { [key: string]: Callback[] } = {};

    register(actionType: string, callback: Callback): void {
        if (!this.callbacks[actionType]) {
            this.callbacks[actionType] = [];
        }
        this.callbacks[actionType].push(callback);
    }

    dispatch(actionType: string, payload?: any): void {
        console.log(`[Dispatcher] Dispatching: ${actionType}`, payload);
        
        // API обрабатывает действия
        api.handleAction(actionType, payload);
        
        const callbacks = this.callbacks[actionType] || [];
        callbacks.forEach(callback => {
            try {
                callback(payload);
            } catch (error) {
                console.error(`Error in callback for ${actionType}:`, error);
            }
        });
    }

    unregister(actionType: string, callback: Callback): void {
        if (this.callbacks[actionType]) {
            this.callbacks[actionType] = this.callbacks[actionType].filter(cb => cb !== callback);
        }
    }
}

export const dispatcher = new Dispatcher();
export default new Dispatcher();