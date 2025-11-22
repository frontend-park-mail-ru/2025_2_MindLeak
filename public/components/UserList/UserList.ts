let userListTemplate: Handlebars.TemplateDelegate | null = null;

interface User {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  isSubscribed?: boolean;
  hideSubscribeButton?: boolean;
}

interface UserListProps {
  title: string;
  users?: User[];
}

async function getUserListTemplate(): Promise<Handlebars.TemplateDelegate> {
  if (userListTemplate) return userListTemplate;
  const userMenuRes = await fetch('/components/UserMenu/UserMenu.hbs');
  const userMenuSource = await userMenuRes.text();
  Handlebars.registerPartial('user-menu', Handlebars.compile(userMenuSource));
  const res = await fetch('/components/UserList/UserList.hbs');
  const source = await res.text();
  userListTemplate = Handlebars.compile(source);
  return userListTemplate;
}

export class UserList {
  private props: UserListProps;

  constructor(props: UserListProps) {
    this.props = props;
  }

  async render(): Promise<HTMLElement> {
    const template = await getUserListTemplate();
    const displayedUsers = this.props.users?.slice(0, 7) || [];
    const html = template({
      title: this.props.title,
      users: displayedUsers
    });
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    const userListElement = div.firstElementChild as HTMLElement;
    if (!userListElement) {
      throw new Error('User list element not found');
    }
    return userListElement;
  }
}