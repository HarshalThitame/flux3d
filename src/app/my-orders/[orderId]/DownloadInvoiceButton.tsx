'use client'

export function DownloadInvoiceButton({ orderId }: { orderId: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const a = document.createElement('a')
        a.href = `/api/orders/${orderId}/invoice`
        a.download = `${orderId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }}
      className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-400/20"
    >
      Download Invoice
    </button>
  )
}
