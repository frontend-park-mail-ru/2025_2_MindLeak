import { dispatcher } from '../dispatcher/dispatcher';

export const subscribeActions = {
    subscribe(userId: number, targetProfileId?: number | string): void {
        dispatcher.dispatch('SUBSCRIBE_REQUEST', { 
            userId, 
            targetProfileId: targetProfileId || userId 
        });
    },
    
    unsubscribe(userId: number, targetProfileId?: number | string): void {
        dispatcher.dispatch('UNSUBSCRIBE_REQUEST', { 
            userId, 
            targetProfileId: targetProfileId || userId 
        });
    }
};