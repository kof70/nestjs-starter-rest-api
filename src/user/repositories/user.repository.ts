import { Injectable, NotFoundException } from '@nestjs/common';

import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  private readonly users: User[] = [];
  private nextId = 1;

  async save(user: User): Promise<User> {
    if (!user.id) {
      user.id = this.nextId++;
      user.createdAt = new Date();
      this.users.push(user);
    } else {
      const index = this.users.findIndex((u) => u.id === user.id);
      if (index >= 0) {
        this.users[index] = { ...this.users[index], ...user };
      } else {
        this.users.push(user);
      }
    }
    user.updatedAt = new Date();
    return user;
  }

  async findOne(params: { where: { id?: number; username?: string } }): Promise<User | null> {
    const { id, username } = params.where;
    if (id !== undefined) {
      return this.users.find((u) => u.id === id) ?? null;
    }
    if (username !== undefined) {
      return this.users.find((u) => u.username === username) ?? null;
    }
    return null;
  }

  async findAndCount(params: {
    where: Record<string, unknown>;
    take: number;
    skip: number;
  }): Promise<[User[], number]> {
    const items = this.users.slice(params.skip, params.skip + params.take);
    return [items, this.users.length];
  }

  async getById(id: number): Promise<User> {
    const user = await this.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }
}
