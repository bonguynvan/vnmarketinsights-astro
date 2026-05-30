import { defineCollection, z } from 'astro:content';

const articlesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishedDate: z.string().optional(),
    lastUpdated: z.string().optional(),
    category: z.string().optional(),
    readingTime: z.number().optional(),
  }),
});

export const collections = {
  'articles': articlesCollection,
};
