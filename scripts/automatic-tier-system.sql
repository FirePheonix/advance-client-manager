-- Complete automatic tier transition system
-- Run this in your Supabase SQL Editor

-- 1. Create or replace the improved tier transition function
CREATE OR REPLACE FUNCTION update_client_tier_transitions()
RETURNS JSON AS $$
DECLARE
    client_record RECORD;
    months_passed INTEGER;
    payments_made INTEGER;
    total_months INTEGER;
    current_tier JSONB;
    tier_index INTEGER;
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
        -- Calculate months passed since client creation
        months_passed := EXTRACT(EPOCH FROM (NOW() - client_record.created_at)) / (30 * 24 * 60 * 60);
        
        -- Count completed payments for this client
        SELECT COUNT(*) INTO payments_made
        FROM payments 
        WHERE client_id = client_record.id 
        AND status = 'completed';
        
        -- Find current tier based on both time and payments made
        total_months := 0;
        tier_index := 0;
        
        -- Check each tier
        FOR i IN 0..(jsonb_array_length(client_record.tiered_payments) - 1)
        LOOP
            current_tier := client_record.tiered_payments -> i;
            total_months := total_months + (current_tier ->> 'duration_months')::integer;
            
            -- Client should be on this tier if:
            -- 1. They haven't exceeded the time limit for this tier, OR
            -- 2. They have made payments equal to this tier number
            IF months_passed < total_months OR payments_made <= (i + 1) THEN
                -- But advance to next tier if they've made enough payments
                IF payments_made > (i + 1) THEN
                    CONTINUE; -- Skip to next tier
                END IF;
                
                tier_index := i;
                
                -- Check if client services need updating
                IF client_record.services::text != (current_tier -> 'services')::text THEN
                    -- Update client to current tier services
                    UPDATE clients 
                    SET 
                        services = current_tier -> 'services',
                        updated_at = NOW()
                    WHERE id = client_record.id;
                    
                    updated_count := updated_count + 1;
                    
                    RAISE NOTICE 'Updated client % to tier % (month %, payments %)', client_record.name, tier_index + 1, months_passed, payments_made;
                END IF;
                
                EXIT; -- Exit tier loop
            END IF;
        END LOOP;
        
        -- If all tiers are completed (by time OR payments), move to final services
        IF (months_passed >= total_months OR payments_made > jsonb_array_length(client_record.tiered_payments)) 
           AND client_record.final_services != '{}'::jsonb THEN
            -- Check if client needs to be moved to final payment structure
            IF client_record.services::text != client_record.final_services::text THEN
                UPDATE clients 
                SET 
                    services = client_record.final_services,
                    tiered_payments = '[]'::jsonb,
                    final_services = '{}'::jsonb,
                    updated_at = NOW()
                WHERE id = client_record.id;
                
                updated_count := updated_count + 1;
                
                RAISE NOTICE 'Moved client % to final payment structure (month %, payments %)', client_record.name, months_passed, payments_made;
            END IF;
        END IF;
    END LOOP;
    
    results := json_build_object(
        'updated_count', updated_count,
        'timestamp', NOW(),
        'status', 'success'
    );
    
    RETURN results;
END;
$$ LANGUAGE plpgsql;

-- 2. Create a trigger function that runs on client updates
CREATE OR REPLACE FUNCTION trigger_update_tier_transitions()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if the client has tiered payments
    IF NEW.tiered_payments IS NOT NULL 
       AND NEW.tiered_payments != '[]'::jsonb
       AND jsonb_array_length(NEW.tiered_payments) > 0 THEN
        
        -- Run the tier transition update for this specific client
        PERFORM update_specific_client_tier(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to auto-update tiers on client access
DROP TRIGGER IF EXISTS auto_update_tier_transitions ON clients;
CREATE TRIGGER auto_update_tier_transitions
    AFTER UPDATE ON clients
    FOR EACH ROW
    WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
    EXECUTE FUNCTION trigger_update_tier_transitions();

-- 4. Create a function to manually run tier updates for all clients
CREATE OR REPLACE FUNCTION update_all_client_tiers()
RETURNS JSON AS $$
BEGIN
    RETURN update_client_tier_transitions();
END;
$$ LANGUAGE plpgsql;

-- 5. Test the function
SELECT update_all_client_tiers();

-- 6. Show current state of tiered clients
SELECT 
    name,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / (30 * 24 * 60 * 60) as months_since_creation,
    services as current_services,
    tiered_payments,
    final_services,
    updated_at
FROM clients 
WHERE tiered_payments != '[]'::jsonb 
AND tiered_payments IS NOT NULL
ORDER BY created_at DESC;

-- 2. Create a trigger function that runs on payment completion
CREATE OR REPLACE FUNCTION trigger_update_tier_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if the payment status is completed
    IF NEW.status = 'completed' THEN
        -- Run the tier transition update for this specific client
        PERFORM update_specific_client_tier(NEW.client_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to auto-update tiers on payment completion
DROP TRIGGER IF EXISTS auto_update_tier_on_payment ON payments;
CREATE TRIGGER auto_update_tier_on_payment
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION trigger_update_tier_on_payment();
