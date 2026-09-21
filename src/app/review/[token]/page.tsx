/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReviewPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Invisible honeypot field
  const [website, setWebsite] = useState('');

  const generateDraft = async () => {
    if (!rating || !notes) return alert('Please provide a rating and some thoughts.');
    setLoading(true);
    try {
      const res = await fetch(`/api/review/${token}/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, customerInput: notes })
      });
      const data = await res.json();
      if (res.ok) {
        setDraft(data.draft);
        setStep(3);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/review/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website, // Honeypot
          rating,
          title: 'Review from ' + customerName,
          body: draft,
          customerName
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStep(4); // Success screen
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Progress */}
        <div className="h-1 bg-gray-100 w-full">
          <motion.div 
            className="h-full bg-indigo-600"
            initial={{ width: '25%' }}
            animate={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold text-center mb-2">How was your experience?</h1>
                <p className="text-center text-gray-500 mb-8">Tap to rate your custom order</p>
                
                <div className="flex justify-center space-x-2 mb-8">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => { setRating(star); setStep(2); }}
                      className="text-4xl text-gray-300 focus:outline-none"
                    >
                      <svg
                        className={`w-12 h-12 ${star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-200'}`}
                        fill="currentColor" viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-2xl font-bold mb-4">What did you love?</h1>
                <p className="text-gray-500 mb-4">Jot down a few words and our AI will help you craft a beautifully written review.</p>
                <textarea 
                  className="w-full border-2 border-gray-200 rounded-xl p-4 mb-4 min-h-[120px] focus:border-indigo-500 outline-none"
                  placeholder="E.g. Great quality, fast shipping, amazing support..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <button 
                  onClick={generateDraft}
                  disabled={loading || !notes}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Generating draft...' : 'Generate Review ✨'}
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-2xl font-bold mb-4">Almost there!</h1>
                <p className="text-gray-500 mb-4">Feel free to edit the draft below before submitting.</p>
                
                {/* Honeypot field - invisible to humans */}
                <input 
                  type="text" 
                  className="hidden" 
                  value={website} 
                  onChange={e => setWebsite(e.target.value)} 
                  tabIndex={-1} 
                  autoComplete="off" 
                />

                <textarea 
                  className="w-full border-2 border-gray-200 rounded-xl p-4 mb-4 min-h-[160px] focus:border-indigo-500 outline-none"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                />
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">Your Name (optional)</label>
                  <input 
                    type="text" 
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                    placeholder="Jane Doe"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                </div>

                <button 
                  onClick={submitReview}
                  disabled={loading || !draft}
                  className="w-full py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Review'}
                </button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold mb-2">Thank You!</h1>
                  <p className="text-gray-500">Your review helps us grow and improve.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
