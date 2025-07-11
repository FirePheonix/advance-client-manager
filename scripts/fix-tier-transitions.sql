-- Quick fix migration for tier transition issues
-- Run this in your Supabase SQL Editor

-- 1. Create a function to manually update a specific client's tier (IMPROVED)
CREATE OR REPLACE FUNCTION update_specific_client_tier(client_id_param UUID)
RETURNS JSON AS $$
DECLARE
    client_record RECORD;
    months_passed INTEGER;
    total_months INTEGER := 0;
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
    
    -- Calculate months passed since client creation (IMPROVED CALCULATION)
    months_passed := (
        EXTRACT(YEAR FROM NOW()) - EXTRACT(YEAR FROM client_record.created_at)
    ) * 12 + (
        EXTRACT(MONTH FROM NOW()) - EXTRACT(MONTH FROM client_record.created_at)
    ) + CASE 
        WHEN EXTRACT(DAY FROM NOW()) >= EXTRACT(DAY FROM client_record.created_at) THEN 0 
        ELSE -1 
    END;
    
    -- Find current tier
    FOR i IN 0..(jsonb_array_length(client_record.tiered_payments) - 1)
    LOOP
        current_tier := client_record.tiered_payments -> i;
        total_months := total_months + (current_tier ->> 'duration_months')::integer;
        
        IF months_passed < total_months THEN
            -- Check if services are different before updating
            IF client_record.services IS DISTINCT FROM (current_tier -> 'services') THEN
                -- Update client to current tier services
                UPDATE clients 
                SET services = current_tier -> 'services'
                WHERE id = client_id_param;
                
                result := json_build_object(
                    'status', 'Updated to tier ' || (i + 1),
                    'tier_index', i + 1,
                    'months_passed', months_passed,
                    'tier_duration', total_months,
                    'old_services', client_record.services,
                    'new_services', current_tier -> 'services',
                    'action', 'SERVICES_UPDATED'
                );
                RETURN result;
            ELSE
                result := json_build_object(
                    'status', 'Already on tier ' || (i + 1),
                    'tier_index', i + 1,
                    'months_passed', months_passed,
                    'tier_duration', total_months,
                    'services', current_tier -> 'services',
                    'action', 'NO_CHANGE'
                );
                RETURN result;
            END IF;
        END IF;
    END LOOP;
    
    -- All tiers completed, use final services
    IF client_record.final_services != '{}'::jsonb THEN
        -- Check if we need to transition to final services
        IF client_record.services IS DISTINCT FROM client_record.final_services 
           OR client_record.tiered_payments != '[]'::jsonb THEN
            UPDATE clients 
            SET 
                services = client_record.final_services,
                tiered_payments = '[]'::jsonb,
                final_services = '{}'::jsonb
            WHERE id = client_id_param;
            
            result := json_build_object(
                'status', 'Completed all tiers - moved to final payment',
                'months_passed', months_passed,
                'old_services', client_record.services,
                'new_services', client_record.final_services,
                'action', 'COMPLETED_TIERS'
            );
            RETURN result;
        END IF;
    END IF;
    
    result := json_build_object(
        'status', 'No update needed',
        'months_passed', months_passed,
        'services', client_record.services,
        'action', 'NO_CHANGE'
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. List all clients with tiered payments to see their current state
SELECT 
    id,
    name,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / (30 * 24 * 60 * 60) as months_since_creation,
    services as current_services,
    tiered_payments,
    final_services
FROM clients 
WHERE tiered_payments != '[]'::jsonb 
AND tiered_payments IS NOT NULL;

-- 3. Manually update all tiered clients (run this to force update)
SELECT 
    name,
    update_specific_client_tier(id) as update_result
FROM clients 
WHERE tiered_payments != '[]'::jsonb 
AND tiered_payments IS NOT NULL;
