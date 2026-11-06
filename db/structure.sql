-- DiEtalase Professional Optimized PostgreSQL Schema
-- Version 2.1 - Refined Auth, Transactions, and Analytics

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Authentication & Users
-- Unified table for both Etalovers and Store Owners
CREATE TABLE IF NOT EXISTS auth_users (
    uid SERIAL PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- 'user', 'owner', 'admin'
    firebase_id VARCHAR(255),
    installation_id VARCHAR(255) UNIQUE, -- Using Firebase Installation ID
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS etalovers (
    eid SERIAL PRIMARY KEY,
    uid INTEGER REFERENCES auth_users(uid) ON DELETE CASCADE,
    name VARCHAR(100),
    image TEXT,
    bio TEXT,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_addresses (
    id SERIAL PRIMARY KEY,
    eid INTEGER REFERENCES etalovers(eid) ON DELETE CASCADE,
    label VARCHAR(50),
    recipient_name VARCHAR(100),
    phone VARCHAR(20),
    full_address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    is_default BOOLEAN DEFAULT FALSE,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Stores & Products
CREATE TABLE IF NOT EXISTS stores (
    sid SERIAL PRIMARY KEY,
    owner_uid INTEGER REFERENCES auth_users(uid) ON DELETE SET NULL,
    name VARCHAR(100),
    type VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    location GEOGRAPHY(POINT, 4326),
    image TEXT,
    contact VARCHAR(20),
    business_reg_url TEXT,
    certification_urls JSONB DEFAULT '[]',
    owner_name VARCHAR(255),
    owner_image TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_status VARCHAR(50) DEFAULT 'starter', -- 'starter', 'pro', 'legend'
    subscription_expires_at TIMESTAMP,
    website_slug VARCHAR(255),
    custom_domain VARCHAR(255),
    open_time VARCHAR(5) DEFAULT '08:00',
    close_time VARCHAR(5) DEFAULT '22:00',
    
    -- Socials
    instagram VARCHAR(255),
    tiktok VARCHAR(255),
    facebook VARCHAR(255),
    youtube VARCHAR(255),
    x_account VARCHAR(255),
    
    -- Stats
    average_rating DECIMAL(2, 1) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    
    gallery JSONB DEFAULT '[]', -- Workshop photos (Max 5)
    operating_hours JSONB DEFAULT '{}', -- 24h operational schedule
    long_description TEXT, -- Brand Story
    vacation_mode BOOLEAN DEFAULT FALSE,
    vacation_return_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    pid SERIAL PRIMARY KEY,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    name VARCHAR(150),
    price DECIMAL(15, 2),
    unit VARCHAR(50),
    description TEXT,
    images JSONB DEFAULT '[]', -- Array of WebP links
    video TEXT, -- WebM/MP4 link
    stock INTEGER DEFAULT 0,
    weight_grams INTEGER DEFAULT 0,
    search_tags JSONB DEFAULT '[]',
    vector TEXT, -- OpenAI Embeddings
    status VARCHAR(20) DEFAULT 'on-review', -- 'on-review', 'approved', 'suspicious', 'rejected'
    moderation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_status_approved ON products(status) WHERE status = 'approved';

-- 4. Transactions & Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    sub_id SERIAL PRIMARY KEY,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    order_id VARCHAR(255) UNIQUE,
    plan_type VARCHAR(50),
    amount DECIMAL(15, 2),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'settled', 'expired', 'failed'
    payment_method VARCHAR(50),
    settlement_time TIMESTAMP,
    expiry_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Analytics Engine (Efficient Bucketing)
-- Granular data for detailed tracking
CREATE TABLE IF NOT EXISTS raw_visits (
    vid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eid INTEGER REFERENCES etalovers(eid) ON DELETE SET NULL,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    pid INTEGER REFERENCES products(pid) ON DELETE CASCADE,
    source VARCHAR(50) DEFAULT 'direct',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pre-aggregated data for fast dashboard charts
CREATE TABLE IF NOT EXISTS store_analytics_daily (
    id SERIAL PRIMARY KEY,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    total_visits INTEGER DEFAULT 0,
    product_visits INTEGER DEFAULT 0,
    UNIQUE(sid, visit_date)
);

CREATE INDEX idx_analytics_date ON store_analytics_daily(visit_date);

-- 6. Reporting & Moderation
CREATE TABLE IF NOT EXISTS reports (
    rid SERIAL PRIMARY KEY,
    reporter_eid INTEGER REFERENCES etalovers(eid) ON DELETE SET NULL,
    target_sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    target_pid INTEGER REFERENCES products(pid) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Reviews & Operating Hours
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    eid INTEGER REFERENCES etalovers(eid) ON DELETE SET NULL,
    stars DECIMAL(2, 1),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_operating_hours (
    id SERIAL PRIMARY KEY,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    day_of_week INTEGER,
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE
);

-- 7. Messaging & AI
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    uid INTEGER REFERENCES auth_users(uid) ON DELETE CASCADE,
    chat_id VARCHAR(255),
    role VARCHAR(50), -- 'user', 'assistant'
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_outbox (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Indices & Triggers
CREATE INDEX idx_stores_location ON stores USING GIST (location);
CREATE INDEX idx_stores_name_trgm ON stores USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- Rating Sync Trigger
CREATE OR REPLACE FUNCTION sync_store_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE stores
    SET 
        average_rating = (SELECT COALESCE(AVG(stars), 0) FROM reviews WHERE sid = NEW.sid),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE sid = NEW.sid)
    WHERE sid = NEW.sid;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_store_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION sync_store_stats();

-- -----------------------------------------------------
-- Table store_subscriptions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS store_subscriptions (
    sub_id SERIAL PRIMARY KEY,
    sid INT NOT NULL REFERENCES stores(sid) ON DELETE CASCADE,
    tier VARCHAR(20) CHECK (tier IN ('artisan', 'maestro')) NOT NULL,
    price_paid DECIMAL(15, 2) NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    midtrans_order_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending'))
);

-- Index for checking active subscriptions quickly
CREATE INDEX idx_sub_sid_status ON store_subscriptions(sid, status);
CREATE INDEX idx_sub_expires ON store_subscriptions(expires_at);
