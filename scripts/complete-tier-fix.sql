-- COMPLETE FIX FOR PAYMENT-TRIGGERED TIER TRANSITIONS
-- Run this entire script in your Supabase SQL Editor

-- 1. Create function to update tier based on payment count
CREATE OR REPLACE FUNCTION update_client_tier_on_payment(client_id_param UUID)
RETURNS JSON AS $$
DECLARE
    client_record RECORD;
    payment_count INTEGER;
    current_tier_index INTEGER := 0;
    current_tier JSONB;
    result JSON;
BEGIN
    -- Get client data
    SELECT * INTO client_record FROM clients WHERE id = client_id_param;
    
    IF NOT FOUND THEN
        RETURN '{"error": "Client not found"}'::JSON;
    END IF;
    
    -- If no tiered payments, nothing to update
    IF client_record.tiered_payments = '[]'::jsonb OR client_record.tiered_payments IS NULL THEN
        RETURN '{"status": "No tiered payments found"}'::JSON;
    END IF;
    
    -- Count completed payments for this client
    SELECT COUNT(*) INTO payment_count 
    FROM payments 
    WHERE client_id = client_id_param 
    AND status = 'completed';
    
    -- Determine current tier based on payment count
    IF payment_count >= jsonb_array_length(client_record.tiered_payments) THEN
        -- All tiers completed, move to final services
        IF client_record.final_services != '{}'::jsonb THEN
            UPDATE clients 
            SET 
                services = client_record.final_services,
                tiered_payments = '[]'::jsonb,
                final_services = '{}'::jsonb,
                updated_at = NOW()
            WHERE id = client_id_param;
            
            result := json_build_object(
                'status', 'Moved to final payment structure',
                'payment_count', payment_count,
                'old_services', client_record.services,
                'new_services', client_record.final_services
            );
            RETURN result;
        END IF;
    ELSE
        -- Update to current tier services
        current_tier := client_record.tiered_payments -> payment_count;
        
        -- Check if services need updating
        IF client_record.services::text != (current_tier -> 'services')::text THEN
            UPDATE clients 
            SET 
                services = current_tier -> 'services',
                updated_at = NOW()
            WHERE id = client_id_param;
            
            result := json_build_object(
                'status', 'Updated to tier ' || (payment_count + 1),
                'tier_index', payment_count + 1,
                'payment_count', payment_count,
                'old_services', client_record.services,
                'new_services', current_tier -> 'services'
            );
            RETURN result;
        END IF;
    END IF;
    
    RETURN '{"status": "No update needed"}'::JSON;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger function that runs when payments are added
CREATE OR REPLACE FUNCTION trigger_tier_update_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run for completed payments
    IF NEW.status = 'completed' THEN
        -- Update the client's tier based on payment count
        PERFORM update_client_tier_on_payment(NEW.client_id);
        
        -- Update the next payment date to next month
        PERFORM update_client_next_payment_date(NEW.client_id, NEW.payment_date::DATE);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to auto-update tiers when payments are added
DROP TRIGGER IF EXISTS auto_update_tier_on_payment ON payments;
CREATE TRIGGER auto_update_tier_on_payment
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION trigger_tier_update_on_payment();

-- 4. Create function to manually update all clients based on their payment count
CREATE OR REPLACE FUNCTION update_all_clients_by_payment_count()
RETURNS JSON AS $$
DECLARE
    client_record RECORD;
    updated_count INTEGER := 0;
    results JSON;
BEGIN
    -- Loop through all clients with tiered payments
    FOR client_record IN 
        SELECT * FROM clients 
        WHERE tiered_payments IS NOT NULL 
        AND tiered_payments != '[]'::jsonb
        AND jsonb_array_length(tiered_payments) > 0
    LOOP
        -- Update this client's tier based on payment count
        PERFORM update_client_tier_on_payment(client_record.id);
        updated_count := updated_count + 1;
    END LOOP;
    
    results := json_build_object(
        'updated_count', updated_count,
        'timestamp', NOW(),
        'status', 'success'
    );
    
    RETURN results;
END;
$$ LANGUAGE plpgsql;

-- 5. Test the system with existing clients
SELECT update_all_clients_by_payment_count();

-- 6. Show current state of all tiered clients with payment counts
SELECT 
    c.name,
    c.created_at,
    c.services as current_services,
    c.tiered_payments,
    c.final_services,
    COALESCE(p.payment_count, 0) as completed_payments,
    CASE 
        WHEN c.tiered_payments = '[]'::jsonb OR c.tiered_payments IS NULL THEN 'Normal Payment'
        WHEN COALESCE(p.payment_count, 0) >= jsonb_array_length(c.tiered_payments) THEN 'Final Payment'
        ELSE 'Tier ' || (COALESCE(p.payment_count, 0) + 1)
    END as current_status
FROM clients c
LEFT JOIN (
    SELECT 
        client_id, 
        COUNT(*) as payment_count
    FROM payments 
    WHERE status = 'completed'
    GROUP BY client_id
) p ON c.id = p.client_id
WHERE c.tiered_payments != '[]'::jsonb 
AND c.tiered_payments IS NOT NULL
ORDER BY c.created_at DESC;

-- 7. Create a function to manually trigger tier update for a specific client
CREATE OR REPLACE FUNCTION manual_tier_update(client_email TEXT)
RETURNS JSON AS $$
DECLARE
    client_id_var UUID;
    result JSON;
BEGIN
    -- Get client ID from email
    SELECT id INTO client_id_var FROM clients WHERE email = client_email;
    
    IF NOT FOUND THEN
        RETURN '{"error": "Client not found"}'::JSON;
    END IF;
    
    -- Update tier for this client
    SELECT update_client_tier_on_payment(client_id_var) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. Create a proper next payment date calculation function
CREATE OR REPLACE FUNCTION calculate_next_payment_date(current_payment_date DATE)
RETURNS DATE AS $$
DECLARE
    next_date DATE;
    current_day INTEGER;
    days_in_next_month INTEGER;
BEGIN
    -- Get the day of the current payment
    current_day := EXTRACT(DAY FROM current_payment_date);
    
    -- Add one month to the current date
    next_date := current_payment_date + INTERVAL '1 month';
    
    -- Handle edge cases for month-end dates
    -- If the resulting day is different from the original day, 
    -- it means the next month has fewer days
    IF EXTRACT(DAY FROM next_date) != current_day THEN
        -- Set to the last day of the target month
        next_date := (DATE_TRUNC('month', next_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END IF;
    
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- 9. Create a function to update client next payment date properly
CREATE OR REPLACE FUNCTION update_client_next_payment_date(client_id_param UUID, current_payment_date DATE)
RETURNS JSON AS $$
DECLARE
    next_payment_date DATE;
    result JSON;
BEGIN
    -- Calculate the next payment date
    next_payment_date := calculate_next_payment_date(current_payment_date);
    
    -- Update the client
    UPDATE clients 
    SET 
        next_payment = next_payment_date::TEXT,
        updated_at = NOW()
    WHERE id = client_id_param;
    
    -- Return result
    result := json_build_object(
        'client_id', client_id_param,
        'current_payment_date', current_payment_date,
        'next_payment_date', next_payment_date,
        'status', 'success'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. Test the next payment date calculation
SELECT 
    '2025-01-31'::DATE as current_date,
    calculate_next_payment_date('2025-01-31'::DATE) as next_date,
    'Should be 2025-02-28' as expected;

SELECT 
    '2025-07-07'::DATE as current_date,
    calculate_next_payment_date('2025-07-07'::DATE) as next_date,
    'Should be 2025-08-07' as expected;

SELECT 
    '2025-07-31'::DATE as current_date,
    calculate_next_payment_date('2025-07-31'::DATE) as next_date,
    'Should be 2025-08-31' as expected;
