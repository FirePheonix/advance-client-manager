-- Test script to validate tier transition system
-- Run this in your Supabase SQL Editor after running automatic-tier-system.sql

-- 1. Create a test client with tier transitions (simulating an old client)
INSERT INTO clients (
    id,
    name,
    email,
    phone,
    services,
    tiered_payments,
    final_services,
    next_payment,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Test Tiered Client - Old',
    'test-old@example.com',
    '+1234567890',
    '{"Social Media Management": 500, "Content Creation": 300}'::jsonb,
    '[
        {
            "amount": 800,
            "duration_months": 3,
            "services": {"Social Media Management": 500, "Content Creation": 300}
        },
        {
            "amount": 1200,
            "duration_months": 3,
            "services": {"Social Media Management": 700, "Content Creation": 400, "SEO": 100}
        }
    ]'::jsonb,
    '{"Social Media Management": 800, "Content Creation": 500, "SEO": 200}'::jsonb,
    '2025-08-07',
    'active',
    NOW() - INTERVAL '4 months',  -- Created 4 months ago (should be in tier 2)
    NOW() - INTERVAL '4 months'
) ON CONFLICT (email) DO UPDATE SET
    created_at = NOW() - INTERVAL '4 months',
    updated_at = NOW() - INTERVAL '4 months',
    services = '{"Social Media Management": 500, "Content Creation": 300}'::jsonb;

-- 2. Create a test client that should complete all tiers
INSERT INTO clients (
    id,
    name,
    email,
    phone,
    services,
    tiered_payments,
    final_services,
    next_payment,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Test Tiered Client - Completed',
    'test-completed@example.com',
    '+1234567891',
    '{"Social Media Management": 500, "Content Creation": 300}'::jsonb,
    '[
        {
            "amount": 800,
            "duration_months": 2,
            "services": {"Social Media Management": 500, "Content Creation": 300}
        },
        {
            "amount": 1200,
            "duration_months": 2,
            "services": {"Social Media Management": 700, "Content Creation": 400, "SEO": 100}
        }
    ]'::jsonb,
    '{"Social Media Management": 800, "Content Creation": 500, "SEO": 200}'::jsonb,
    '2025-08-07',
    'active',
    NOW() - INTERVAL '7 months',  -- Created 7 months ago (should be on final payment)
    NOW() - INTERVAL '7 months'
) ON CONFLICT (email) DO UPDATE SET
    created_at = NOW() - INTERVAL '7 months',
    updated_at = NOW() - INTERVAL '7 months',
    services = '{"Social Media Management": 500, "Content Creation": 300}'::jsonb;

-- 3. Show clients before update
SELECT 
    name,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / (30 * 24 * 60 * 60) as months_since_creation,
    services as current_services,
    tiered_payments,
    final_services,
    'BEFORE UPDATE' as status
FROM clients 
WHERE email IN ('test-old@example.com', 'test-completed@example.com')
ORDER BY created_at DESC;

-- 4. Run the tier transition update
SELECT update_all_client_tiers();

-- 5. Show clients after update
SELECT 
    name,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / (30 * 24 * 60 * 60) as months_since_creation,
    services as current_services,
    tiered_payments,
    final_services,
    'AFTER UPDATE' as status
FROM clients 
WHERE email IN ('test-old@example.com', 'test-completed@example.com')
ORDER BY created_at DESC;

-- 6. Test payment rate calculation
SELECT 
    name,
    email,
    (
        SELECT SUM(value::numeric)
        FROM jsonb_each_text(services)
    ) as calculated_payment_rate,
    services
FROM clients 
WHERE email IN ('test-old@example.com', 'test-completed@example.com');
