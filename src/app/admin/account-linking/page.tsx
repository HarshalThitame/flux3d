import AccountLinkingClient from './AccountLinkingClient'

export const metadata = {
  title: 'Account Linking | Admin Dashboard',
  description: 'Manage WhatsApp account linking requests and consent logs.',
}

export default function AccountLinkingPage() {
  return <AccountLinkingClient />
}