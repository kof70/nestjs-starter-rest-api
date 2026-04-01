import { Injectable, NotFoundException } from '@nestjs/common';

import { Article } from '../entities/article.entity';

@Injectable()
export class ArticleRepository {
  private readonly articles: Article[] = [];
  private nextId = 1;

  async save(article: Article): Promise<Article> {
    if (!article.id) {
      article.id = this.nextId++;
      article.createdAt = new Date();
      this.articles.push(article);
    } else {
      const index = this.articles.findIndex((a) => a.id === article.id);
      if (index >= 0) {
        this.articles[index] = { ...this.articles[index], ...article };
      } else {
        this.articles.push(article);
      }
    }
    article.updatedAt = new Date();
    return article;
  }

  async findOne(params: { where: { id: number } }): Promise<Article | null> {
    return this.articles.find((a) => a.id === params.where.id) ?? null;
  }

  async findAndCount(params: {
    where: Record<string, unknown>;
    take: number;
    skip: number;
  }): Promise<[Article[], number]> {
    const items = this.articles.slice(params.skip, params.skip + params.take);
    return [items, this.articles.length];
  }

  async remove(article: Article): Promise<Article> {
    const index = this.articles.findIndex((a) => a.id === article.id);
    if (index >= 0) {
      this.articles.splice(index, 1);
    }
    return article;
  }

  async getById(id: number): Promise<Article> {
    const article = await this.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException();
    }

    return article;
  }
}
