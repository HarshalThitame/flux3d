import {
  BarChart3,
  Box,
  FileStack,
  FolderKanban,
  LayoutDashboard,
  Quote,
  Settings,
  Users,
} from 'lucide-react'
import type {
  ActivityItem,
  AdminFile,
  AdminMaterial,
  AdminNavItem,
  AdminOrder,
  AdminQuote,
  AdminUser,
  DashboardMetric,
  DonutSlice,
  TrendPoint,
} from '@/lib/admin/types'

export const adminNavItems: AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Orders', href: '/admin/orders', icon: Box },
  { label: 'Quotes', href: '/admin/quotes', icon: Quote },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Materials', href: '/admin/materials', icon: FolderKanban },
  { label: 'Files', href: '/admin/files', icon: FileStack },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export const dashboardMetrics: DashboardMetric[] = [
  { label: 'Total Orders', value: '1,248', change: '+14.2%', tone: 'positive' },
  { label: 'Revenue', value: '₹8.4L', change: '+9.8%', tone: 'positive' },
  { label: 'Pending Requests', value: '36', change: '-4 today', tone: 'warning' },
  { label: 'Active Prints', value: '18', change: '6 printers live', tone: 'neutral' },
]

export const ordersTrend: TrendPoint[] = [
  { label: 'Jan', value: 38 },
  { label: 'Feb', value: 52 },
  { label: 'Mar', value: 49 },
  { label: 'Apr', value: 66 },
  { label: 'May', value: 72 },
  { label: 'Jun', value: 81 },
  { label: 'Jul', value: 75 },
]

export const revenueTrend: TrendPoint[] = [
  { label: 'Jan', value: 120 },
  { label: 'Feb', value: 180 },
  { label: 'Mar', value: 160 },
  { label: 'Apr', value: 230 },
  { label: 'May', value: 280 },
  { label: 'Jun', value: 310 },
  { label: 'Jul', value: 340 },
]

export const ordersGrowth: TrendPoint[] = [
  { label: 'Week 1', value: 24 },
  { label: 'Week 2', value: 30 },
  { label: 'Week 3', value: 33 },
  { label: 'Week 4', value: 44 },
  { label: 'Week 5', value: 47 },
  { label: 'Week 6', value: 53 },
]

export const materialUsage: DonutSlice[] = [
  { label: 'PLA Pro', value: 42, color: '#FF7B43' },
  { label: 'ABS Tough', value: 26, color: '#38BDF8' },
  { label: 'PETG', value: 18, color: '#34D399' },
  { label: 'Nylon CF', value: 14, color: '#FBBF24' },
]

export const recentActivity: ActivityItem[] = [
  { id: 'ac-1', title: 'Order FLX-2026-118 approved', meta: 'By operator Aditi', type: 'order', time: '4 min ago' },
  { id: 'ac-2', title: 'Quote Q-884 converted to order', meta: 'Customer: Revloop Labs', type: 'quote', time: '18 min ago' },
  { id: 'ac-3', title: 'New enterprise user invited', meta: 'ops@aetherfab.in', type: 'user', time: '35 min ago' },
  { id: 'ac-4', title: 'PLA Pro price updated', meta: '₹2.8/g to ₹3.1/g', type: 'material', time: '1 hr ago' },
]

export const adminOrders: AdminOrder[] = [
  { id: 'ord-1', orderNumber: 'FLX-2026-118', fullName: 'Revloop Labs', material: 'PLA Pro', totalPrice: 1840, status: 'approved', createdAt: '2026-04-28', notes: 'Rush prototype for investor demo.' },
  { id: 'ord-2', orderNumber: 'FLX-2026-117', fullName: 'Priya Menon', material: 'PETG', totalPrice: 640, status: 'printing', createdAt: '2026-04-28', notes: 'Functional hinge assembly.' },
  { id: 'ord-3', orderNumber: 'FLX-2026-116', fullName: 'AetherFab', material: 'ABS Tough', totalPrice: 2290, status: 'pending', createdAt: '2026-04-27', notes: 'Awaiting operator review.' },
  { id: 'ord-4', orderNumber: 'FLX-2026-115', fullName: 'Campus Robotics', material: 'PLA Pro', totalPrice: 480, status: 'reviewed', createdAt: '2026-04-27', notes: 'Student discount applied.' },
  { id: 'ord-5', orderNumber: 'FLX-2026-114', fullName: 'Mosaic Build', material: 'Nylon CF', totalPrice: 3980, status: 'completed', createdAt: '2026-04-26', notes: 'High-strength bracket set.' },
  { id: 'ord-6', orderNumber: 'FLX-2026-113', fullName: 'Neel Joshi', material: 'PLA Pro', totalPrice: 320, status: 'rejected', createdAt: '2026-04-26', notes: 'Model had non-manifold geometry.' },
]

export const adminQuotes: AdminQuote[] = [
  { id: '886', quote_id: 'Q-886', name: 'Lume Design', email: 'hello@lumedesign.io', config: { materialId: 'pla-pro' }, estimate: { total: 820 }, status: 'pending', createdAt: '2026-04-28' },
  { id: '885', quote_id: 'Q-885', name: 'RapidKart', email: 'ops@rapidkart.in', config: { materialId: 'petg' }, estimate: { total: 1460 }, status: 'approved', createdAt: '2026-04-28' },
  { id: '884', quote_id: 'Q-884', name: 'Revloop Labs', email: 'team@revlooplabs.com', config: { materialId: 'abs-tough' }, estimate: { total: 2290 }, status: 'converted', createdAt: '2026-04-27' },
  { id: '883', quote_id: 'Q-883', name: 'Ava S.', email: 'ava@example.com', config: { materialId: 'pla-pro' }, estimate: { total: 310 }, status: 'rejected', createdAt: '2026-04-27' },
]

export const adminUsers: AdminUser[] = [
  { id: 'usr-1', name: 'Punam Gunjal', email: 'punam@flux3d.in', signupMethod: 'Google', role: 'admin', lastActive: '2 min ago' },
  { id: 'usr-2', name: 'Aditi Rao', email: 'aditi@flux3d.in', signupMethod: 'Email', role: 'operator', lastActive: '7 min ago' },
  { id: 'usr-3', name: 'Rohan Nair', email: 'rohan@revlooplabs.com', signupMethod: 'Google', role: 'customer-success', lastActive: '14 min ago' },
  { id: 'usr-4', name: 'Priya Menon', email: 'priya.menon@gmail.com', signupMethod: 'Email', role: 'customer-success', lastActive: '1 hr ago' },
]

export const adminMaterials: AdminMaterial[] = [
  { id: 'mat-1', name: 'PLA Pro', price_per_gram: 3.1, density: 1.24, colors: ['Graphite', 'Arctic White', 'Neon Coral'], stock: 'Healthy' },
  { id: 'mat-2', name: 'PETG', price_per_gram: 4.2, density: 1.27, colors: ['Smoke', 'Clear Blue'], stock: 'Healthy' },
  { id: 'mat-3', name: 'ABS Tough', price_per_gram: 5.1, density: 1.04, colors: ['Matte Black', 'Signal Red'], stock: 'Low' },
  { id: 'mat-4', name: 'Nylon CF', price_per_gram: 8.6, density: 1.19, colors: ['Carbon'], stock: 'Paused' },
]

export const adminFiles: AdminFile[] = [
  { id: 'file-1', name: 'servo_mount_v12.stl', user: 'Revloop Labs', uploadedAt: '2026-04-28', size: '12.4 MB' },
  { id: 'file-2', name: 'hinge_assembly.3mf', user: 'Priya Menon', uploadedAt: '2026-04-28', size: '4.6 MB' },
  { id: 'file-3', name: 'campus-bot-wheel.obj', user: 'Campus Robotics', uploadedAt: '2026-04-27', size: '8.2 MB' },
  { id: 'file-4', name: 'housing_shell_final.stl', user: 'AetherFab', uploadedAt: '2026-04-27', size: '16.8 MB' },
]
