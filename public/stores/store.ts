import { dispatcher } from '../dispatcher/dispatcher';


export abstract class BaseStore<T> {
    protected state: T;
    protected listeners: (() => void)[] = [];

    constructor(initialState: T) {
        this.state = initialState;
        this.registerActions();
    }

    protected abstract registerActions(): void;

    getState(): T {
        return { ...this.state };
    }

    protected setState(newState: Partial<T>): void {
        this.state = { ...this.state, ...newState };
        this.emitChange();
    }

    addListener(listener: () => void): void {
        this.listeners.push(listener);
    }

    removeListener(listener: () => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    protected emitChange(): void {
        this.listeners.forEach(listener => listener());
    }

    protected registerAction(actionType: string, handler: (payload?: any) => void): void {
        dispatcher.register(actionType, handler);
    }
}