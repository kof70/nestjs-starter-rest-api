import { User } from '../../user/entities/user.entity';

export class Article {
  id: number;

  title: string;

  post: string;

  createdAt: Date;

  updatedAt: Date;

  author: User;
}
