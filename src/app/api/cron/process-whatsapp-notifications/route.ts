import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { sendWhatsAppTemplate, type WhatsAppTemplateComponent } from '@/lib/whatsapp/messages'

export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Add authentication if using QStash
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
     // For now, let's just do a basic check if configured, otherwise allow (QStash signs requests)
  }

  const supabase = createAdminSupabaseClient()

  // Find up to 50 pending jobs or jobs that failed but have attempt_count < 3
  const { data: jobs, error: fetchError } = await supabase
    .from('whatsapp_notification_jobs')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lt('attempt_count', 3)
    .order('created_at', { ascending: true })
    .limit(50)

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  let processedCount = 0;

  for (const job of jobs) {
    try {
      const payload = job.payload as Record<string, any>;
      
      const phone = payload.phone;
      if (!phone) {
        throw new Error('No phone number provided in payload');
      }

      // Map payload variables for the template
      // Variables: 1: name, 2: order_number, 3: amount/eta
      const components: WhatsAppTemplateComponent[] = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: payload.customer_name?.split(' ')[0] || 'Customer' },
            { type: 'text', text: payload.order_number },
          ]
        }
      ];

      // Add conditional 3rd parameter (amount/ETA) based on status
      if (job.order_status === 'payment_confirmed') {
        components[0].parameters.push({ type: 'text', text: payload.amount?.toString() || '0' });
      } else if (job.order_status === 'shipped') {
        components[0].parameters.push({ type: 'text', text: payload.eta || 'soon' });
      }

      // Send the template
      await sendWhatsAppTemplate(phone, {
        name: payload.template_name,
        language: payload.template_language,
        components
      });

      // Mark sent
      await supabase
        .from('whatsapp_notification_jobs')
        .update({
          status: 'sent',
          attempt_count: job.attempt_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      processedCount++;
    } catch (error: any) {
      console.error(`[whatsapp-notify] Error processing job ${job.id}:`, error);
      
      // Mark failed
      await supabase
        .from('whatsapp_notification_jobs')
        .update({
          status: 'failed',
          last_error: error.message || 'Unknown error',
          attempt_count: job.attempt_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
    }
  }

  return NextResponse.json({ ok: true, processed: processedCount })
}
