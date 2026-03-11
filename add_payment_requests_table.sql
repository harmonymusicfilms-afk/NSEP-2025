-- Payment Requests Table for Manual Payments
-- This table stores manual payment submissions with QR code/bank transfer details

create table if not exists public.payment_requests (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade not null,
    amount decimal(10, 2) not null,
    class_level integer not null,
    transaction_id text not null,
    proof_url text not null,
    status text not null default 'PENDING_REVIEW' check (status in ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    rejected_reason text,
    submitted_at timestamptz default now(),
    reviewed_at timestamptz,
    reviewed_by uuid references auth.users(id),
    student_name text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create index for faster queries
create index idx_payment_requests_student_id on public.payment_requests(student_id);
create index idx_payment_requests_status on public.payment_requests(status);
create index idx_payment_requests_submitted_at on public.payment_requests(submitted_at desc);

-- Enable RLS
alter table public.payment_requests enable row level security;

-- RLS Policies for payment_requests
create policy "Students can view own payment requests"
    on public.payment_requests for select
    using (
        auth.uid() = student_id or
        exists(
            select 1 from public.admins
            where user_id = auth.uid() and status = 'ACTIVE'
        )
    );

create policy "Admins can manage all payment requests"
    on public.payment_requests for all
    using (
        exists(
            select 1 from public.admins
            where user_id = auth.uid() and status = 'ACTIVE'
        )
    );

create policy "Students can insert own payment requests"
    on public.payment_requests for insert
    with check (auth.uid() = student_id);

-- Trigger to update payment status when request is approved
create or replace function public.handle_payment_request_approval()
returns trigger as $$
begin
    if new.status = 'APPROVED' and old.status != 'APPROVED' then
        -- Create or update payment record
        insert into public.payments (student_id, razorpay_order_id, amount, status, paid_at)
        values (new.student_id, 'MANUAL_' || new.id, new.amount, 'SUCCESS', now())
        on conflict do nothing;
    end if;
    return new;
end;
$$ language plpgsql;

-- Create trigger for payment request approval
create trigger on_payment_request_approval
    after update on public.payment_requests
    for each row execute function public.handle_payment_request_approval();
