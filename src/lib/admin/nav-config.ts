import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  CreditCard,
  Printer,
  Ticket,
  Settings,
  Building2,
  FileText,
  HelpCircle,
  LogOut,
  Beaker,
  Eye,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  section: 'main' | 'secondary'
  badge?: number
}

export const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, section: 'main' },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart, section: 'main' },
  { label: 'Customers', href: '/admin/customers', icon: Users, section: 'main' },
  { label: 'Products', href: '/admin/products', icon: Package, section: 'main' },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, section: 'main' },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard, section: 'main' },
  { label: 'Inventory', href: '/admin/inventory', icon: Printer, section: 'main' },
  { label: 'Materials', href: '/admin/materials', icon: Beaker, section: 'main' },
  { label: 'Blog', href: '/admin/blog', icon: Eye, section: 'main' },
  { label: 'Support Tickets', href: '/admin/tickets', icon: Ticket, section: 'secondary' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, section: 'secondary' },
  { label: 'Business Settings', href: '/admin/settings/business', icon: Building2, section: 'secondary' },
  { label: 'Documentation', href: '/admin/documentation', icon: FileText, section: 'secondary' },
  { label: 'Help Center', href: '/admin/help', icon: HelpCircle, section: 'secondary' },
  { label: 'Logout', href: '/admin/logout', icon: LogOut, section: 'secondary' },
]
