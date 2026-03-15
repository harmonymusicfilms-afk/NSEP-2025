import { client as backend } from '@/lib/backend';
import { ExamSchedule, Student, NotificationLogType } from '@/types';
import { sendEmailNotification } from '@/lib/emailNotifications';

export const ExamSchedulerService = {
    /**
     * Main automation runner (would be triggered by a Cron job)
     * Checks for upcoming exams and triggers appropriate notifications/actions.
     */
    async runAutomatedWorkflow(): Promise<void> {
        const today = new Date();

        // 1. Ensure future exams are scheduled (Always ensure next 5th is there)
        await this.ensureMonthlyExamScheduled();

        // 2. Fetch all active schedules
        const { data: schedules, error } = await backend
            .from('exam_schedules')
            .select('*')
            .in('status', ['SCHEDULED', 'NOTIFYING']);

        if (error || !schedules) return;

        for (const schedule of schedules) {
            await this.processScheduleItem(schedule);
        }
    },

    /**
     * Processes a specific exam schedule item:
     * - Checks if it's within the 5-day notification window
     * - Dispatches Email & WhatsApp reminders
     * - Triggers AI question generation if needed
     */
    async processScheduleItem(schedule: any): Promise<void> {
        const examDate = new Date(schedule.exam_date);
        const today = new Date();
        const diffDays = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Handle Notification Window (5 days before)
        if (diffDays <= 5 && diffDays > 0) {
            const typeMap: Record<number, NotificationLogType> = {
                5: 'REMINDER_5D',
                4: 'REMINDER_4D',
                3: 'REMINDER_3D',
                2: 'REMINDER_2D',
                1: 'REMINDER_1D'
            };

            const notifType = typeMap[diffDays];
            if (notifType) {
                await this.dispatchBulkNotifications(schedule.id, notifType, schedule.exam_date);
            }
        }

        // Handle Exam Day
        if (diffDays === 0) {
            await this.dispatchBulkNotifications(schedule.id, 'EXAM_DAY', schedule.exam_date);

            // Update status to LIVE
            const { error: updateError } = await backend.from('exam_schedules').update({ status: 'LIVE' }).eq('id', schedule.id);
            if (updateError) {
                console.error('Failed to update exam_schedules status to LIVE:', updateError);
            }
        }
    },

    /**
     * Ensures the next monthly exam (on the 5th) is scheduled
     */
    async ensureMonthlyExamScheduled(): Promise<void> {
        const now = new Date();
        // Target next month's 5th
        let year = now.getFullYear();
        let month = now.getMonth() + 1; // getMonth is 0-indexed, so +1 is next month
        if (month > 11) {
            month = 0;
            year++;
        }

        const targetDate = new Date(year, month, 5);
        const dateStr = targetDate.toISOString().split('T')[0];

        const { data } = await backend
            .from('exam_schedules')
            .select('id')
            .eq('exam_date', dateStr)
            .limit(1);

        if (!data || data.length === 0) {
            console.log(`[Scheduler] Auto-scheduling recurring exam for ${dateStr}`);
            const { error: insertError } = await backend.from('exam_schedules').insert([{
                exam_date: dateStr,
                status: 'SCHEDULED',
                recurring: true,
                auto_generate_questions: true
            }]);
            if (insertError) {
                console.error('Failed to auto-schedule exam:', insertError);
            }
        }
    },

    /**
     * Dispatches notifications to all eligible students
     */
    async dispatchBulkNotifications(scheduleId: string, type: NotificationLogType, examDate: string): Promise<void> {
        // 1. Get all active students
        const { data: students } = await backend
            .from('students')
            .select('*')
            .eq('status', 'ACTIVE');

        if (!students) return;

        console.log(`[Bulk Notifier] Sending ${type} for Exam ${examDate} to ${students.length} students`);

        for (const student of students) {
            // Check if already sent today (avoid duplicates)
            const { data: existing } = await backend
                .from('notification_dispatch_logs')
                .select('id')
                .eq('schedule_id', scheduleId)
                .eq('student_id', student.id)
                .eq('notif_type', type)
                .limit(1);

            if (existing && existing.length > 0) continue;

            // 2. Dispatch Email
            await sendEmailNotification('EXAM_REMINDER', student.email, {
                studentName: student.name,
                studentEmail: student.email,
                class: student.class_level,
                examDate: examDate
            });

            // 3. Dispatch WhatsApp (Simulated with Log)
            await this.sendWhatsAppMessage(student.mobile, `Namaste ${student.name}, this is a reminder for your upcoming GPHDM Scholarship Exam on ${examDate}. Prep well!`);

            // 4. Log the dispatch
            const { error: whatsAppError } = await backend.from('notification_dispatch_logs').insert([{
                schedule_id: scheduleId,
                student_id: student.id,
                channel: 'WHATSAPP',
                notif_type: type,
                status: 'SENT',
                sent_at: new Date().toISOString()
            }]);
            if (whatsAppError) {
                console.error('Failed to log WhatsApp notification:', whatsAppError);
            }

            const { error: emailError } = await backend.from('notification_dispatch_logs').insert([{
                schedule_id: scheduleId,
                student_id: student.id,
                channel: 'EMAIL',
                notif_type: type,
                status: 'SENT',
                sent_at: new Date().toISOString()
            }]);
            if (emailError) {
                console.error('Failed to log email notification:', emailError);
            }
        }
    },

    /**
     * WhatsApp Message Provider Integration (Stub)
     * This would call a service like Twilio, Gupshup, or a local WhatsApp gateway.
     */
    async sendWhatsAppMessage(mobile: string, message: string): Promise<{ success: boolean; sid?: string }> {
        // Architectural implementation for WhatsApp gateway
        console.log(`[WhatsApp Gateway] Sending to ${mobile}: ${message}`);
        // Mocking a successful provider response
        return { success: true, sid: `WA_${Math.random().toString(36).substr(2, 9)}` };
    }
};
