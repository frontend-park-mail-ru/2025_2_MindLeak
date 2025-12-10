import { BaseStore } from './store';

export interface UserListItem {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  isSubscribed?: boolean;
  hideSubscribeButton?: boolean;
}

export interface UserListState {
  users: UserListItem[] | null;
  isLoading: boolean;
  error: string | null;
}

class UserListStore extends BaseStore<UserListState> {
  constructor() {
    super({
      users: null,
      isLoading: false,
      error: null
    });
  }

  protected registerActions(): void {
    this.registerAction('USER_LIST_LOAD_REQUEST', () => {
      this.setState({
        isLoading: true,
        error: null
      });
    });

    this.registerAction('USER_LIST_LOAD_SUCCESS', (payload: { users: UserListItem[] }) => {
      this.setState({
        users: payload.users,
        isLoading: false,
        error: null
      });
    });

    this.registerAction('USER_LIST_LOAD_FAIL', (payload: { error: string }) => {
      this.setState({
        isLoading: false,
        error: payload.error
      });
    });
  }
}

export const userListStore = new UserListStore();