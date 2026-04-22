import {DM_Sans, Syne} from 'next/font/google'

const syne = Syne({subsets: ['latin'], variable: '--font-syne'})
const dmSans = DM_Sans({subsets: ['latin'], variable: '--font-dm'})
export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    )
}