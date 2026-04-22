'use client'
import {supabase} from '@/lib/supabase'
import {useState} from 'react'

export default function QuoteForm() {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const {error} = await supabase.from('quotes').insert({
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            message: formData.get('message'),
        })

        if (!error) alert('Quote submitted! We\'ll WhatsApp you shortly.')
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit}>
            <input name="name" placeholder="Your Name" required/>
            <input name="email" type="email" placeholder="Email" required/>
            <input name="phone" placeholder="WhatsApp Number"/>
            <textarea name="message" placeholder="Describe your project"/>
            <button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Get Quote'}
            </button>
        </form>
    )
}