import { group, pageInGroup, pageInSection } from '../utils/navigation'

export const sidebar = [
  pageInSection('认识 NBTCA', 'about', 'index'),
  group({
    text: '从这里开始',
    collapsed: false,
    base: '/about/',
    items: [
      pageInGroup('什么是 NBTCA', 'what-is-nbtca'),
      pageInGroup('加入我们', 'join'),
      pageInGroup('组织与沿革', 'organization'),
      pageInGroup('基础设施与项目', 'infrastructure'),
    ],
  }),
]
