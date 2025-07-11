-- Migration script to update existing database schema
-- Run these commands in your Supabase SQL editor or database client

-- 1. Add any missing columns to clients table (if they don't exist)
-- Note: Most columns should already exist, but let's make sure

-- Check if final_services column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'final_services') THEN
        ALTER TABLE clients ADD COLUMN final_services JSONB DEFAULT '{}';
    END IF;
END $$;

-- Check if final_monthly_rate column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'final_monthly_rate') THEN
        ALTER TABLE clients ADD COLUMN final_monthly_rate DECIMAL(10,2);
    END IF;
END $$;

-- Check if final_weekly_rate column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'final_weekly_rate') THEN
        ALTER TABLE clients ADD COLUMN final_weekly_rate DECIMAL(10,2);
    END IF;
END $$;

-- 2. Update existing clients to have NULL base rates (services-only pricing model)
UPDATE clients 
SET 
    monthly_rate = NULL,
    weekly_rate = NULL,
    final_monthly_rate = NULL,
    final_weekly_rate = NULL
WHERE monthly_rate IS NOT NULL OR weekly_rate IS NOT NULL;

-- 3. Update tiered_payments JSON to remove amount fields (set to 0)
UPDATE clients 
SET tiered_payments = (
    SELECT jsonb_agg(
        jsonb_set(tier, '{amount}', '0')
    )
    FROM jsonb_array_elements(tiered_payments) AS tier
)
WHERE tiered_payments != '[]'::jsonb AND tiered_payments IS NOT NULL;

-- 4. Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_tiered_payments ON clients USING GIN(tiered_payments);
CREATE INDEX IF NOT EXISTS idx_clients_final_services ON clients USING GIN(final_services);

-- 5. Add any missing functions
CREATE OR REPLACE FUNCTION get_client_current_tier(client_id UUID)
RETURNS TABLE (
    tier_index INTEGER,
    tier_services JSONB,
    is_complete BOOLEAN,
    total_payment_amount NUMERIC
) AS $$
DECLARE
    client_record RECORD;
    months_passed INTEGER;
    total_months INTEGER := 0;
    tier_record JSONB;
    service_key TEXT;
    service_amount NUMERIC;
    total_amount NUMERIC := 0;
BEGIN
    -- Get client data
    SELECT * INTO client_record FROM clients WHERE id = client_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- If no tiered payments, return normal payment info
    IF client_record.tiered_payments = '[]'::jsonb OR client_record.tiered_payments IS NULL THEN
        -- Calculate total from services
        FOR service_key, service_amount IN 
            SELECT key, value::numeric FROM jsonb_each_text(client_record.services)
        LOOP
            total_amount := total_amount + service_amount;
        END LOOP;
        
        RETURN QUERY SELECT -1, client_record.services, false, total_amount;
        RETURN;
    END IF;
    
    -- Calculate months passed since client creation
    months_passed := EXTRACT(EPOCH FROM (NOW() - client_record.created_at)) / (30 * 24 * 60 * 60);
    
    -- Find current tier
    FOR i IN 0..(jsonb_array_length(client_record.tiered_payments) - 1)
    LOOP
        tier_record := client_record.tiered_payments -> i;
        total_months := total_months + (tier_record ->> 'duration_months')::integer;
        
        IF months_passed < total_months THEN
            -- Calculate total amount from tier services
            total_amount := 0;
            FOR service_key, service_amount IN 
                SELECT key, value::numeric FROM jsonb_each_text(tier_record -> 'services')
            LOOP
                total_amount := total_amount + service_amount;
            END LOOP;
            
            RETURN QUERY SELECT i, tier_record -> 'services', false, total_amount;
            RETURN;
        END IF;
    END LOOP;
    
    -- All tiers completed, use final services
    total_amount := 0;
    FOR service_key, service_amount IN 
        SELECT key, value::numeric FROM jsonb_each_text(client_record.final_services)
    LOOP
        total_amount := total_amount + service_amount;
    END LOOP;
    
    RETURN QUERY SELECT -1, client_record.final_services, true, total_amount;
END;
$$ LANGUAGE plpgsql;

-- 6. Create a function to update tier transitions automatically
CREATE OR REPLACE FUNCTION update_client_tier_transitions()
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    old_services JSONB,
    new_services JSONB,
    action TEXT
) AS $$
DECLARE
    client_record RECORD;
    tier_info RECORD;
BEGIN
    -- Loop through all clients with tiered payments
    FOR client_record IN 
        SELECT * FROM clients 
        WHERE tiered_payments != '[]'::jsonb 
        AND tiered_payments IS NOT NULL 
        AND status = 'active'
    LOOP
        -- Get current tier info
        SELECT * INTO tier_info FROM get_client_current_tier(client_record.id);
        
        IF tier_info.is_complete AND client_record.final_services != '{}'::jsonb THEN
            -- Client completed all tiers, transition to final payment
            UPDATE clients 
            SET 
                services = client_record.final_services,
                tiered_payments = '[]'::jsonb,
                final_services = '{}'::jsonb
            WHERE id = client_record.id;
            
            RETURN QUERY SELECT 
                client_record.id, 
                client_record.name, 
                client_record.services, 
                client_record.final_services, 
                'COMPLETED_TIERS'::TEXT;
                
        ELSIF NOT tier_info.is_complete AND tier_info.tier_services != client_record.services THEN
            -- Client is in a tier but services don't match current tier
            UPDATE clients 
            SET services = tier_info.tier_services
            WHERE id = client_record.id;
            
            RETURN QUERY SELECT 
                client_record.id, 
                client_record.name, 
                client_record.services, 
                tier_info.tier_services, 
                ('UPDATED_TO_TIER_' || (tier_info.tier_index + 1)::TEXT)::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Run the tier transition update for existing clients
SELECT * FROM update_client_tier_transitions();

COMMIT;
