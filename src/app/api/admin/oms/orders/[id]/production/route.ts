// @ts-nocheck
/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/admin/server';

// POST /api/admin/oms/orders/[id]/production — create production job
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { id } = await params;
    const body = await req.json();

    const {
      orderItemId,
      printerName,
      operatorId,
      estimatedTimeMins,
      priority = 'NORMAL',
    } = body;

    const { data: job, error } = await supabase
      .from('oms_production_jobs')
      .insert({
        order_id: id,
        order_item_id: orderItemId || null,
        printer_name: printerName || null,
        operator_id: operatorId || null,
        status: 'QUEUED',
        priority,
        estimated_time_mins: estimatedTimeMins || null,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('oms_audit_logs').insert({
      order_id: id,
      action: 'PRODUCTION_JOB_CREATED',
      new_value: `Printer: ${printerName || 'TBD'}`,
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (err: any) {
    console.error('[OMS] POST /production error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/oms/orders/[id]/production — update job status / log print attempt
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { id } = await params;
    const body = await req.json();
    const { jobId, status, actualTimeMins, printAttempt } = body;

    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (actualTimeMins) updates.actual_time_mins = actualTimeMins;
    if (status === 'PRINTING') updates.production_started_at = new Date().toISOString();
    if (status === 'COMPLETED' || status === 'QC_PASSED') updates.production_completed_at = new Date().toISOString();

    const { data: job, error: jobError } = await supabase
      .from('oms_production_jobs')
      .update(updates)
      .eq('id', jobId)
      .eq('order_id', id)
      .select()
      .single();
    if (jobError) throw jobError;

    // Log print attempt if provided
    if (printAttempt) {
      const { attemptNumber, status: attemptStatus, failureReason, operatorNotes,
              materialUsedGrams, filamentType, filamentColor } = printAttempt;
      await supabase.from('oms_print_attempts').insert({
        job_id: jobId,
        attempt_number: attemptNumber,
        status: attemptStatus,
        failure_reason: failureReason || null,
        operator_notes: operatorNotes || null,
        material_used_grams: materialUsedGrams || null,
        filament_type: filamentType || null,
        filament_color: filamentColor || null,
        started_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ job });
  } catch (err: any) {
    console.error('[OMS] PATCH /production error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
