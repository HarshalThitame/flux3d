import {
  LayoutDashboard,
  MessageCircle,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  CreditCard,
  Ticket,
  Settings,
  Building2,
  FileText,
  ShieldCheck,
  LogOut,
  Beaker,
  Eye,
  Gift,
  ClipboardCheck,
  TicketCheck,
  Star,
  Bell,
  Printer,
  ReceiptText,
  ScanSearch,
  Webhook,
  Factory,
  Database,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  section: 'main' | 'shop' | 'secondary'
  badge?: number
}

export const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, section: 'main' },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart, section: 'main' },
  { label: 'Customers', href: '/admin/customers', icon: Users, section: 'main' },
  { label: 'Products', href: '/admin/products', icon: Package, section: 'main' },
  { label: 'Quotes', href: '/admin/quotes', icon: ClipboardCheck, section: 'main' },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard, section: 'main' },
  { label: 'Refunds', href: '/admin/refunds', icon: ReceiptText, section: 'main' },
  { label: 'Reconciliation', href: '/admin/reconciliation', icon: ScanSearch, section: 'main' },
  { label: 'Webhook Health', href: '/admin/webhook-health', icon: Webhook, section: 'main' },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText, section: 'main' },
  { label: 'Printers', href: '/admin/printers', icon: Printer, section: 'main' },
  { label: 'Manufacturing', href: '/admin/manufacturing', icon: Factory, section: 'main' },
  { label: 'Materials', href: '/admin/materials', icon: Beaker, section: 'main' },
  { label: 'Offers', href: '/admin/offers', icon: Gift, section: 'main' },
  { label: 'Coupons', href: '/admin/coupons', icon: TicketCheck, section: 'main' },
  { label: 'Blog', href: '/admin/blog', icon: Eye, section: 'main' },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, section: 'main' },
  { label: '3D Shop Categories', href: '/admin/3d-shop/categories', icon: Beaker, section: 'shop' },
  { label: '3D Shop Products', href: '/admin/3d-shop/products', icon: Package, section: 'shop' },
  { label: '3D Shop Orders', href: '/admin/3d-shop/orders', icon: ShoppingCart, section: 'shop' },
  { label: '3D Shop Reviews', href: '/admin/3d-shop/reviews', icon: Star, section: 'shop' },
  { label: '3D Shop Notify Me', href: '/admin/3d-shop/notify-me', icon: Bell, section: 'shop' },
  { label: 'Support Tickets', href: '/admin/tickets', icon: Ticket, section: 'secondary' },
  { label: 'Team & Roles', href: '/admin/team', icon: ShieldCheck, section: 'secondary' },
  { label: 'Data Retention', href: '/admin/settings/retention', icon: Database, section: 'secondary' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, section: 'secondary' },
  { label: 'Business Settings', href: '/admin/settings/business', icon: Building2, section: 'secondary' },
  { label: 'WhatsApp Knowledge', href: '/admin/settings/whatsapp-knowledge', icon: Database, section: 'secondary' },
  { label: 'WhatsApp Inbox', href: '/admin/whatsapp/inbox', icon: MessageCircle, section: 'secondary' },
  { label: 'Logout', href: '/admin/logout', icon: LogOut, section: 'secondary' },
]
