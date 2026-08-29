import { groupFromDir, pageInSection } from '../../utils/navigation'

export const sidebar = [
  pageInSection('指南', 'tutorial', 'index'),
  groupFromDir('流程', 'process/2025'),
  groupFromDir('教程', 'tutorial/2025'),
  groupFromDir('手册', 'tutorial/manual'),
]
