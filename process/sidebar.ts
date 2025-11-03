export const sidebar = [
  {
    text: '说明',
    link: '/process/index',
  },
  {
    text: '2025版本',
    collapsed: false,
    base: '/process/2025/',
    items: [
      {
        text: '申报流程',
        items: [
          {
            text: '借教室',
            link: 'borrow-classroom',
          },
          {
            text: '申请第二课堂学分',
            link: 'apply-for-credits',
          },
          {
            text: '撰写并发布你的第一篇NBTCA博客',
            link: 'nbtca-post',
          },
        ],
      },
    ],
  },
]
