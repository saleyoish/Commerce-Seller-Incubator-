// Automated Stream Scheduler Service
// Handles automatic stream scheduling, reminders, and start triggers

import { createAdminSupabase } from '@/lib/supabase-admin';

export interface ScheduleConfig {
  sellerId: string;
  title: string;
  description?: string;
  platforms: string[];
  productsFeatured: string[];
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  startDate: string;
  startTime: string;
  duration: number;
  endDate?: string;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday) for weekly recurrence
}

export interface ScheduledReminder {
  streamSessionId: string;
  reminderTime: string;
  sent: boolean;
}

// Create a recurring stream schedule
export async function createRecurringSchedule(config: ScheduleConfig) {
  const supabase = createAdminSupabase();
  
  const scheduleDates = calculateScheduleDates(config);
  
  const sessions = [];
  
  for (const date of scheduleDates) {
    const scheduledStart = new Date(`${date}T${config.startTime}`);
    
    const { data, error } = await supabase
      .from('stream_sessions')
      .insert({
        seller_id: config.sellerId,
        title: config.title,
        description: config.description,
        scheduled_start: scheduledStart.toISOString(),
        status: 'scheduled',
        type: 'automated',
        platforms: config.platforms,
        products_featured: config.productsFeatured,
        metadata: {
          recurrence: config.recurrence,
          auto_generated: true,
        },
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating scheduled session:', error);
      continue;
    }
    
    sessions.push(data);
    
    // Schedule reminders (15 min, 1 hour, 1 day before)
    await scheduleReminders(data.id, scheduledStart);
  }
  
  return sessions;
}

// Calculate all dates for a recurring schedule
function calculateScheduleDates(config: ScheduleConfig): string[] {
  const dates: string[] = [];
  const startDate = new Date(config.startDate);
  const endDate = config.endDate ? new Date(config.endDate) : null;
  
  if (config.recurrence === 'none') {
    dates.push(config.startDate);
    return dates;
  }
  
  if (config.recurrence === 'daily') {
    let currentDate = new Date(startDate);
    while (!endDate || currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  if (config.recurrence === 'weekly' && config.daysOfWeek) {
    let currentDate = new Date(startDate);
    while (!endDate || currentDate <= endDate) {
      if (config.daysOfWeek!.includes(currentDate.getDay())) {
        dates.push(currentDate.toISOString().split('T')[0]);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  if (config.recurrence === 'monthly') {
    let currentDate = new Date(startDate);
    while (!endDate || currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }
  
  return dates;
}

// Schedule reminders for a stream session
async function scheduleReminders(streamSessionId: string, scheduledStart: Date) {
  const supabase = createAdminSupabase();
  
  const reminderTimes = [
    { minutes: 1440, label: '1 day' }, // 1 day before
    { minutes: 60, label: '1 hour' },   // 1 hour before
    { minutes: 15, label: '15 min' },   // 15 min before
  ];
  
  for (const reminder of reminderTimes) {
    const reminderTime = new Date(scheduledStart.getTime() - reminder.minutes * 60000);
    
    await supabase
      .from('stream_reminders')
      .insert({
        stream_session_id: streamSessionId,
        reminder_time: reminderTime.toISOString(),
        reminder_type: reminder.label,
        sent: false,
      });
  }
}

// Check and send due reminders
export async function processDueReminders() {
  const supabase = createAdminSupabase();
  const now = new Date();
  
  const { data: dueReminders, error } = await supabase
    .from('stream_reminders')
    .select('*, stream_sessions!inner(seller_id, title, scheduled_start)')
    .eq('sent', false)
    .lte('reminder_time', now.toISOString());
  
  if (error || !dueReminders) {
    console.error('Error fetching due reminders:', error);
    return [];
  }
  
  const sentReminders = [];
  
  for (const reminder of dueReminders) {
    try {
      // Send reminder notification (email, push, etc.)
      await sendReminderNotification(reminder);
      
      // Mark as sent
      await supabase
        .from('stream_reminders')
        .update({ sent: true, sent_at: now.toISOString() })
        .eq('id', reminder.id);
      
      sentReminders.push(reminder);
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }
  
  return sentReminders;
}

// Send reminder notification
async function sendReminderNotification(reminder: any) {
  // In production, this would send email/push notification
  console.log(`Sending ${reminder.reminder_type} reminder for stream: ${reminder.stream_sessions.title}`);
  
  // TODO: Integrate with email service (Resend)
  // TODO: Integrate with push notification service
}

// Auto-start scheduled streams that are due
export async function autoStartDueStreams() {
  const supabase = createAdminSupabase();
  const now = new Date();
  
  // Find scheduled streams that should start now (within 5 minute window)
  const { data: dueStreams, error } = await supabase
    .from('stream_sessions')
    .select('*')
    .eq('status', 'scheduled')
    .eq('type', 'automated')
    .lte('scheduled_start', now.toISOString())
    .gte('scheduled_start', new Date(now.getTime() - 5 * 60000).toISOString());
  
  if (error || !dueStreams) {
    console.error('Error fetching due streams:', error);
    return [];
  }
  
  const startedStreams = [];
  
  for (const stream of dueStreams) {
    try {
      // Auto-start the stream
      const { error: startError } = await supabase
        .from('stream_sessions')
        .update({
          status: 'live',
          actual_start: now.toISOString(),
        })
        .eq('id', stream.id);
      
      if (startError) {
        console.error('Error auto-starting stream:', startError);
        continue;
      }
      
      startedStreams.push(stream);
      
      // Notify seller that stream has auto-started
      await sendAutoStartNotification(stream);
    } catch (error) {
      console.error('Error in auto-start process:', error);
    }
  }
  
  return startedStreams;
}

// Send auto-start notification
async function sendAutoStartNotification(stream: any) {
  console.log(`Stream auto-started: ${stream.title}`);
  // TODO: Send notification to seller
}

// Cancel missed scheduled streams
export async function cancelMissedStreams() {
  const supabase = createAdminSupabase();
  const now = new Date();
  
  // Cancel scheduled streams that are more than 15 minutes past their start time
  const { data: missedStreams, error } = await supabase
    .from('stream_sessions')
    .select('*')
    .eq('status', 'scheduled')
    .lt('scheduled_start', new Date(now.getTime() - 15 * 60000).toISOString());
  
  if (error || !missedStreams) {
    console.error('Error fetching missed streams:', error);
    return [];
  }
  
  const cancelledStreams = [];
  
  for (const stream of missedStreams) {
    try {
      const { error: cancelError } = await supabase
        .from('stream_sessions')
        .update({
          status: 'cancelled',
          metadata: {
            ...stream.metadata,
            cancelled_reason: 'missed_start_time',
            cancelled_at: now.toISOString(),
          },
        })
        .eq('id', stream.id);
      
      if (cancelError) {
        console.error('Error cancelling missed stream:', cancelError);
        continue;
      }
      
      cancelledStreams.push(stream);
      
      // Notify seller that stream was cancelled
      await sendMissedStreamNotification(stream);
    } catch (error) {
      console.error('Error in cancel process:', error);
    }
  }
  
  return cancelledStreams;
}

// Send missed stream notification
async function sendMissedStreamNotification(stream: any) {
  console.log(`Stream cancelled (missed): ${stream.title}`);
  // TODO: Send notification to seller
}

// Get upcoming scheduled streams for a seller
export async function getSellerUpcomingStreams(sellerId: string, limit = 10) {
  const supabase = createAdminSupabase();
  const now = new Date();
  
  const { data, error } = await supabase
    .from('stream_sessions')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('status', 'scheduled')
    .gte('scheduled_start', now.toISOString())
    .order('scheduled_start', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching upcoming streams:', error);
    return [];
  }
  
  return data || [];
}
