import { group, pageInGroup, pageInSection } from '../utils/navigation'

export const sidebar = [
  pageInSection('说明', 'process', 'index'),
  group({
    text: '2025版本',
    collapsed: false,
    base: '/process/2025/',
    items: [
      group({
        text: '申报流程',
        items: [
          pageInGroup('借教室', 'borrow-classroom'),
          pageInGroup('申请第二课堂学分', 'apply-for-credits'),
          pageInGroup('撰写并发布你的第一篇NBTCA博客', 'nbtca-post'),
          pageInGroup('报销流程', 'reimbursement-process'),
        ],
      }),
      group({
        text: '组织活动',
        items: [
          pageInGroup('活动举办文档(待完善)', 'event-organization'),
        ],
      }),
    ],
  }),
]
