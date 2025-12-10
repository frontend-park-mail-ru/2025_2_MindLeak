import { BaseStore } from './store';
import { STATISTICS_ACTION_TYPES } from '../actions/actionStatistic';

export interface StatisticsState {
    isLoading: boolean;
    error: string | null;
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    supportRequests: any[];
    isSupportRequestsLoading: boolean;
    supportRequestsError: string | null;
}

class StatisticsStore extends BaseStore<StatisticsState> {
    constructor() {
        super({
            isLoading: false,
            error: null,
            total: 0,
            byCategory: {},
            byStatus: {},
            supportRequests: [],
            isSupportRequestsLoading: false,
            supportRequestsError: null
        });
    }

    protected registerActions(): void {
        // Обработка основной статистики
        this.registerAction(STATISTICS_ACTION_TYPES.STATISTICS_LOAD_REQUEST, () => {
            this.setState({
                isLoading: true,
                error: null
            });
        });

        this.registerAction(STATISTICS_ACTION_TYPES.STATISTICS_LOAD_SUCCESS, (payload: { 
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

        this.registerAction(STATISTICS_ACTION_TYPES.STATISTICS_LOAD_FAIL, (payload: { error: string }) => {
            this.setState({
                isLoading: false,
                error: payload.error
            });
        });

        // Обработка списка обращений
        this.registerAction(STATISTICS_ACTION_TYPES.SUPPORT_REQUESTS_LOAD_REQUEST, () => {
            this.setState({
                isSupportRequestsLoading: true,
                supportRequestsError: null
            });
        });

        this.registerAction(STATISTICS_ACTION_TYPES.SUPPORT_REQUESTS_LOAD_SUCCESS, (payload: { supportRequests: any[] }) => {
            this.setState({
                isSupportRequestsLoading: false,
                supportRequests: payload.supportRequests
            });
        });

        this.registerAction(STATISTICS_ACTION_TYPES.SUPPORT_REQUESTS_LOAD_FAIL, (payload: { error: string }) => {
            this.setState({
                isSupportRequestsLoading: false,
                supportRequestsError: payload.error
            });
        });
    }
}

export const statisticsStore = new StatisticsStore();