import { BaseStore } from './store';

export interface StatisticsState {
    isLoading: boolean;
    error: string | null;
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    supportRequests: any[];
}

class StatisticsStore extends BaseStore<StatisticsState> {
    constructor() {
        super({
            isLoading: false,
            error: null,
            total: 0,
            byCategory: {},
            byStatus: {},
            supportRequests: []
        });
    }

    protected registerActions(): void {
        this.registerAction('STATISTICS_LOAD_REQUEST', () => {
            this.setState({
                isLoading: true,
                error: null
            });
        });

        this.registerAction('STATISTICS_LOAD_SUCCESS', (payload: { 
            total: number; 
            byCategory: Record<string, number>; 
            byStatus: Record<string, number>; 
        }) => {
            this.setState({
                isLoading: false,
                total: payload.total,
                byCategory: payload.byCategory,
                byStatus: payload.byStatus
            });
        });

        this.registerAction('STATISTICS_LOAD_FAIL', (payload: { error: string }) => {
            this.setState({
                isLoading: false,
                error: payload.error
            });
        });

        this.registerAction('SUPPORT_REQUESTS_LOAD_REQUEST', () => {
            this.setState({
                isLoading: true,
                error: null
            });
        });

        this.registerAction('SUPPORT_REQUESTS_LOAD_SUCCESS', (payload: { supportRequests: any[] }) => {
            this.setState({
                isLoading: false,
                supportRequests: payload.supportRequests
            });
        });

        this.registerAction('SUPPORT_REQUESTS_LOAD_FAIL', (payload: { error: string }) => {
            this.setState({
                isLoading: false,
                error: payload.error
            });
        });
    }
}

export const statisticsStore = new StatisticsStore();