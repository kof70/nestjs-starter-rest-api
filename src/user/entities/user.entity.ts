import { Article } from '../../article/entities/article.entity';

export class User {
  id: number;

  name: string;

  password: string;

  username: string;

  roles: string[];

  isAccountDisabled: boolean;

  email: string;

  createdAt: Date;

  updatedAt: Date;

  articles: Article[];
}
