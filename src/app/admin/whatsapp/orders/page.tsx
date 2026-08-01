import WhatsAppOrdersClient from './WhatsAppOrdersClient'

export const metadata = {
  title: 'WhatsApp Orders | Admin Dashboard',
  description: 'Manage automated WhatsApp catalog orders and payment links.',
}

export default function WhatsAppOrdersPage() {
  return <WhatsAppOrdersClient />
}
