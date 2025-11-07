import { BaseStore } from './store';
import { Post } from './storePosts';

export interface ProfileData {
    id: number;
    name: string;
    email: string;
    avatar_url: string;
    cover_url: string;
    description: string;
    subscribers: number;
    subscriptions: number;
    postsCount: number;
    isSubscribed: boolean;
}

export interface ProfileState {
    profile: ProfileData | null;
    posts: Post[];
    comments: any[];
    activeTab: 'posts' | 'comments';
    isLoading: boolean;
    error: string | null;
    isEditingDescription: boolean;
}

class ProfileStore extends BaseStore<ProfileState> {
    constructor() {
        super({
            profile: null,
            posts: [],
            comments: [],
            activeTab: 'posts',
            isLoading: false,
            error: null,
            isEditingDescription: false
        });
    }

    protected registerActions(): void {
        this.registerAction('PROFILE_LOAD_REQUEST', () => {
            this.setState({
                isLoading: true,
                error: null
            });
        });

        this.registerAction('PROFILE_LOAD_SUCCESS', (payload: { profile: ProfileData; posts: Post[] }) => {
            this.setState({
                profile: payload.profile,
                posts: payload.posts,
                isLoading: false,
                error: null
            });
        });

        this.registerAction('PROFILE_LOAD_FAIL', (payload: { error: string }) => {
            this.setState({
                isLoading: false,
                error: payload.error
            });
        });

        this.registerAction('PROFILE_CHANGE_TAB', (payload: { tab: 'posts' | 'comments' }) => {
            this.setState({
                activeTab: payload.tab
            });
        });

        this.registerAction('PROFILE_START_EDIT_DESCRIPTION', () => {
            this.setState({
                isEditingDescription: true
            });
        });

        this.registerAction('PROFILE_CANCEL_EDIT_DESCRIPTION', () => {
            this.setState({
                isEditingDescription: false
            });
        });

        this.registerAction('PROFILE_UPDATE_DESCRIPTION_REQUEST', () => {
            this.setState({
                isLoading: true,
                error: null
            });
        });

        this.registerAction('PROFILE_UPDATE_DESCRIPTION_SUCCESS', (payload: { description: string }) => {
            if (this.state.profile) {
                this.setState({
                    profile: {
                        ...this.state.profile,
                        description: payload.description
                    },
                    isLoading: false,
                    isEditingDescription: false,
                    error: null
                });
            }
        });

        this.registerAction('PROFILE_UPDATE_DESCRIPTION_FAIL', (payload: { error: string }) => {
            this.setState({
                isLoading: false,
                error: payload.error
            });
        });
    }
}

export const profileStore = new ProfileStore();
