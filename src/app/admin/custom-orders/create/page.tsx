import { Metadata } from 'next'
import CreateCustomOrderForm from './CreateCustomOrderForm'

export const metadata: Metadata = {
  title: 'Create Custom Order — Admin',
}

export default function CreateCustomOrderPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <CreateCustomOrderForm />
    </div>
  )
}
