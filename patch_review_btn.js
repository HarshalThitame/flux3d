const fs = require('fs');
const path = '/home/rutik-thitame/flux3d/src/app/admin/custom-orders/[orderId]/CustomOrderDetailClient.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add states
code = code.replace(
  "const [isUpdating, setIsUpdating] = useState(false)",
  "const [isUpdating, setIsUpdating] = useState(false)\n  const [generatingReviewLink, setGeneratingReviewLink] = useState(false)\n  const [reviewLink, setReviewLink] = useState<string | null>(null)"
);

// Add generate function
const generateReviewLinkFunc = `
  const generateReviewLink = async () => {
    setGeneratingReviewLink(true)
    try {
      const response = await fetch(\`/api/admin/orders/\${orderId}/review-link\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_type: 'custom_order' })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate review link')
      setReviewLink(data.url)
      setToast({ type: 'success', message: 'Review link generated' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Error generating link' })
    } finally {
      setGeneratingReviewLink(false)
    }
  }
`;
code = code.replace("const generatePaymentLink = async () => {", generateReviewLinkFunc + "\n  const generatePaymentLink = async () => {");

// Add Review button to UI
const reviewUI = `
          {/* Review Card */}
          {order.status === 'delivered' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#0F1B3D]">Review</h2>
              </div>
              <div className="space-y-4">
                {reviewLink ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-1 text-xs font-semibold text-[#6F7192]">Review Link</div>
                    <div className="flex items-center gap-2">
                      <input 
                        readOnly 
                        value={reviewLink} 
                        className="w-full bg-transparent text-sm text-[#0F1B3D] outline-none"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(reviewLink)
                          setToast({ type: 'success', message: 'Link copied to clipboard' })
                        }}
                        className="text-[#6F7192] hover:text-[#6d28d9]"
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={generateReviewLink}
                    disabled={generatingReviewLink}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#6d28d9] py-2.5 text-sm font-semibold text-[#6d28d9] shadow-sm hover:bg-purple-50 disabled:opacity-70"
                  >
                    {generatingReviewLink ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    Request a Review
                  </button>
                )}
              </div>
            </div>
          )}
`;
code = code.replace("{/* Payment Card */}", reviewUI + "\n          {/* Payment Card */}");

fs.writeFileSync(path, code);
