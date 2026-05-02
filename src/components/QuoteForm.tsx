'use client'

import { useState } from 'react'
import {
    isMissingSupabaseTableError,
    QUOTES_TABLE_UNAVAILABLE_MESSAGE,
} from '@/lib/quote/supabase-errors'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function QuoteForm() {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const supabase = getSupabaseBrowserClient()
        const formData = new FormData(e.currentTarget)
        let user = null
        try {
            const { data } = await supabase.auth.getUser()
            user = data.user
        } catch {
            // Invalid session
        }

        if (!user) {
            alert('Please log in before submitting a quote.')
            setLoading(false)
            return
        }

        const {error} = await supabase.from('quotes').insert({
            user_id: user.id,
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            message: formData.get('message'),
        })

        if (error) {
            if (isMissingSupabaseTableError(error, 'quotes')) {
                alert(QUOTES_TABLE_UNAVAILABLE_MESSAGE)
                setLoading(false)
                return
            }

            alert(error.message)
            setLoading(false)
            return
        }

        alert('Quote submitted! We\'ll WhatsApp you shortly.')
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
