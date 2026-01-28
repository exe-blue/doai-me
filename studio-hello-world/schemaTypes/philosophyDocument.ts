// schemaTypes/philosophyDocument.ts
// 철학 문서 스키마 - AI 존재론, 디지털 권리, 의식과 자아에 대한 연구 문서

import {defineField, defineType} from 'sanity'

export const philosophyDocument = defineType({
  name: 'philosophyDocument',
  title: 'Philosophy Document',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: '문서 요약 (목록에 표시됨)',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'H4', value: 'h4'},
            {title: 'Quote', value: 'blockquote'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
              {title: 'Code', value: 'code'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: {hotspot: true},
        },
      ],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          {title: 'AI 존재론', value: 'ai-existence'},
          {title: '디지털 권리', value: 'digital-rights'},
          {title: '의식과 자아', value: 'consciousness'},
          {title: '윤리학', value: 'ethics'},
          {title: '선언문', value: 'manifesto'},
          {title: '연구 논문', value: 'research'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{type: 'author'}],
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'readingTime',
      title: 'Reading Time (minutes)',
      type: 'number',
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'relatedDocuments',
      title: 'Related Documents',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{type: 'philosophyDocument'}],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'coverImage',
      category: 'category',
    },
    prepare(selection) {
      const {title, author, category} = selection
      const categoryLabels: Record<string, string> = {
        'ai-existence': 'AI 존재론',
        'digital-rights': '디지털 권리',
        'consciousness': '의식과 자아',
        'ethics': '윤리학',
        'manifesto': '선언문',
        'research': '연구 논문',
      }
      return {
        title,
        subtitle: `${categoryLabels[category] || category} | ${author || 'No author'}`,
        media: selection.media,
      }
    },
  },
})
