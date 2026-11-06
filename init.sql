-- DiEtalase Database Initialization Script (Comprehensive)
-- Consolidated from backup, migrations, and deep code analysis
-- For PostgreSQL with PostGIS and pg_trgm

\connect dietalase_db;

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tables

-- System Settings (Global Config)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (key, value, description)
VALUES ('ai_moderation_enabled', 'false', 'Enable/Disable AI auto-moderation for new products')
ON CONFLICT (key) DO NOTHING;

-- Field Admins
CREATE TABLE IF NOT EXISTS field_admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    nickname VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS field_admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES field_admins(id) ON DELETE CASCADE,
    action VARCHAR(50), 
    target_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stores
CREATE TABLE IF NOT EXISTS stores (
    sid SERIAL PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(100),
    description TEXT,
    description_ai TEXT,
    address TEXT,
    city VARCHAR(100),
    location GEOGRAPHY(POINT, 4326),
    google_id VARCHAR(100),
    image TEXT,
    profile_image TEXT,
    cover_image TEXT,
    contact VARCHAR(50),
    phone VARCHAR(50),
    owner_name VARCHAR(100),
    owner_image TEXT,
    subscription INTEGER DEFAULT 1,
    subscription_status VARCHAR(50) DEFAULT 'standard',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    installation_id VARCHAR(255),
    firebase_id VARCHAR(255),
    fcm_token TEXT,
    android_id VARCHAR(255),
    joined_at DATE,
    vector TEXT, -- JSON vector
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    facilities TEXT,
    website_slug VARCHAR(255),
    gallery JSONB DEFAULT '[]', 
    certification_urls JSONB DEFAULT '[]',
    operating_hours JSONB DEFAULT '{}',
    open_time TIME,
    close_time TIME,
    status VARCHAR(50) DEFAULT 'pending', -- pending, verified, rejected, on-review
    instagram VARCHAR(255),
    tiktok VARCHAR(255),
    facebook VARCHAR(255),
    youtube VARCHAR(255),
    x_account VARCHAR(255),
    email VARCHAR(255),
    long_description TEXT, -- Brand Story
    vacation_mode BOOLEAN DEFAULT FALSE,
    vacation_return_date DATE,
    is_managed_by_admin BOOLEAN DEFAULT FALSE,
    news_feed JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(android_id),
    UNIQUE(installation_id),
    UNIQUE(website_slug)
);

-- Insert AI Concierge Virtual Store (SID 1000 for easy reference)
INSERT INTO stores (sid, name, type, description, status, website_slug)
VALUES (1000, 'DiEtalase AI Concierge', 'Digital Assistant', 'Your personal curator for the artisan world.', 'verified', 'ai-concierge')
ON CONFLICT (sid) DO NOTHING;

-- Products
CREATE TABLE IF NOT EXISTS products (
    pid SERIAL PRIMARY KEY,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    name VARCHAR(255),
    price NUMERIC(15,2) DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'item',
    description TEXT,
    description_ai TEXT,
    image TEXT, -- Legacy main image link (deprecated in favor of images[0])
    images JSONB DEFAULT '[]', 
    video TEXT,
    status VARCHAR(50) DEFAULT 'approved', -- approved, pending, rejected, on-review
    curator_note TEXT,
    search_tags JSONB DEFAULT '[]',
    stock INTEGER DEFAULT 0,
    weight_grams INTEGER DEFAULT 0,
    vector TEXT, -- JSON vector
    is_managed_by_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Materialized View for Cities (Fast Location Search)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_store_cities AS
SELECT DISTINCT TRIM(city) as city_name, COUNT(*) as store_count
FROM stores
WHERE city IS NOT NULL AND city != ''
GROUP BY city_name;

CREATE INDEX IF NOT EXISTS idx_mv_cities_name ON mv_store_cities (city_name);

-- Users (Etalovers)
CREATE TABLE IF NOT EXISTS etalovers (
    eid SERIAL PRIMARY KEY,
    google_id VARCHAR(255),
    firebase_id VARCHAR(255),
    fcm_token TEXT,
    android_id VARCHAR(255),
    installation_id VARCHAR(255),
    name VARCHAR(255) DEFAULT 'User Baru',
    full_name VARCHAR(255),
    image TEXT,
    theme VARCHAR(20) DEFAULT 'Light',
    latitude DOUBLE PRECISION DEFAULT 0,
    longitude DOUBLE PRECISION DEFAULT 0,
    domicile VARCHAR(255),
    subscription_status VARCHAR(50) DEFAULT 'free', -- free, premium
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    bio TEXT,
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(android_id),
    UNIQUE(installation_id)
);

-- Shipping Infrastructure
CREATE TABLE IF NOT EXISTS user_addresses (
    id SERIAL PRIMARY KEY,
    eid INTEGER REFERENCES etalovers(eid) ON DELETE CASCADE,
    label VARCHAR(50), -- 'Home', 'Work', 'Atelier'
    recipient_name VARCHAR(100),
    phone VARCHAR(20),
    full_address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    is_default BOOLEAN DEFAULT FALSE,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    eid INTEGER REFERENCES etalovers(eid) ON DELETE SET NULL,
    stars NUMERIC(2,1),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Store Operating Hours (Legacy/Alternative structure)
CREATE TABLE IF NOT EXISTS store_operating_hours (
    id SERIAL PRIMARY KEY,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    day_of_week INTEGER,
    open_time TIME,
    close_time TIME,
    UNIQUE(sid, day_of_week)
);

-- User Saved Products
CREATE TABLE IF NOT EXISTS user_saved_products (
    eid INTEGER REFERENCES etalovers(eid) ON DELETE CASCADE,
    pid INTEGER REFERENCES products(pid) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (eid, pid)
);

-- User Saved Stores
CREATE TABLE IF NOT EXISTS user_saved_stores (
    eid INTEGER REFERENCES etalovers(eid) ON DELETE CASCADE,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (eid, sid)
);

-- User Saved Routes
CREATE TABLE IF NOT EXISTS user_saved_routes (
    id SERIAL PRIMARY KEY,
    eid INTEGER REFERENCES etalovers(eid) ON DELETE CASCADE,
    title VARCHAR(255),
    route_data TEXT, -- JSON
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Visits
CREATE TABLE IF NOT EXISTS visits (
    vid VARCHAR(255) PRIMARY KEY,
    eid INTEGER REFERENCES etalovers(eid) ON DELETE CASCADE,
    pid INTEGER REFERENCES products(pid) ON DELETE CASCADE,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    source VARCHAR(255) DEFAULT 'direct',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product Visit Stats (Aggregated Daily)
CREATE TABLE IF NOT EXISTS product_visit_stats (
    pid INTEGER REFERENCES products(pid) ON DELETE CASCADE,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    visit_date DATE,
    visit_count INTEGER DEFAULT 0,
    PRIMARY KEY (pid, sid, visit_date)
);

-- Granular data for detailed tracking
CREATE TABLE IF NOT EXISTS raw_visits (
    vid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eid INTEGER REFERENCES etalovers(eid) ON DELETE SET NULL,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    pid INTEGER REFERENCES products(pid) ON DELETE CASCADE,
    source VARCHAR(50) DEFAULT 'direct',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

CREATE INDEX IF NOT EXISTS idx_analytics_date ON store_analytics_daily(visit_date);
CREATE INDEX IF NOT EXISTS idx_raw_visits_debounce ON raw_visits(eid, pid, created_at);

-- Community Reports
CREATE TABLE IF NOT EXISTS reports (
    rid SERIAL PRIMARY KEY,
    reporter_eid INTEGER REFERENCES etalovers(eid) ON DELETE SET NULL,
    target_sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    target_pid INTEGER REFERENCES products(pid) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, resolved, dismissed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Separate Vector Storage (If used by specific modules)
CREATE TABLE IF NOT EXISTS store_vectors (
    sid INTEGER PRIMARY KEY REFERENCES stores(sid) ON DELETE CASCADE,
    vector TEXT -- JSON
);

CREATE TABLE IF NOT EXISTS product_vectors (
    pid INTEGER PRIMARY KEY REFERENCES products(pid) ON DELETE CASCADE,
    vector TEXT -- JSON
);

-- Login & Registration (OTP)
CREATE TABLE IF NOT EXISTS login (
    contact VARCHAR(50) PRIMARY KEY,
    code VARCHAR(10),
    sent VARCHAR(10) DEFAULT 'false',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registration (
    contact VARCHAR(50) PRIMARY KEY,
    code VARCHAR(10),
    sent VARCHAR(10) DEFAULT 'false',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pending Stores (Legacy Table)
CREATE TABLE IF NOT EXISTS pending_stores (
    ticket_id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    location GEOGRAPHY(POINT, 4326),
    google_id VARCHAR(100),
    image TEXT,
    contact VARCHAR(50),
    owner_name VARCHAR(100),
    owner_image TEXT,
    firebase_id VARCHAR(255),
    fcm_token TEXT,
    android_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(50),
    message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Subscriptions & Payments
CREATE TABLE IF NOT EXISTS store_subscription_pending (
    order_id VARCHAR(255) PRIMARY KEY,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    product VARCHAR(100),
    subscription_type INTEGER,
    price NUMERIC(15,2),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_subscription_settlement (
    order_id VARCHAR(255) PRIMARY KEY,
    sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    product VARCHAR(100),
    subscription_type INTEGER,
    price NUMERIC(15,2),
    transaction_id VARCHAR(255),
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    subscription_end DATE
);

-- ChatGPT Subscriptions
CREATE TABLE IF NOT EXISTS chatgpt_order (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255),
    variant VARCHAR(100),
    price NUMERIC(15,2),
    status VARCHAR(50),
    phone_number VARCHAR(50),
    email_address VARCHAR(255),
    order_date TIMESTAMP WITH TIME ZONE,
    referral_code VARCHAR(100),
    referral_paid VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS chatgpt_pending (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255),
    variant VARCHAR(100),
    price NUMERIC(15,2),
    status VARCHAR(50),
    phone_number VARCHAR(50),
    email_address VARCHAR(255),
    order_date TIMESTAMP WITH TIME ZONE,
    referral_code VARCHAR(100),
    referral_paid VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS chatgpt_referral (
    id SERIAL PRIMARY KEY,
    payment_method VARCHAR(255),
    phone_number VARCHAR(50)
);

-- Chat History
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(255),
    role VARCHAR(50),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat System
CREATE TABLE IF NOT EXISTS chat_threads (
    id SERIAL PRIMARY KEY,
    user_eid INTEGER REFERENCES etalovers(eid) ON DELETE CASCADE,
    store_sid INTEGER REFERENCES stores(sid) ON DELETE CASCADE,
    is_ai_chat BOOLEAN DEFAULT false,
    last_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_eid, store_sid, is_ai_chat)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER REFERENCES chat_threads(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL, -- user, store, ai
    sender_id INTEGER NOT NULL, -- eid if user, sid if store/ai
    message_type VARCHAR(50) DEFAULT 'text', -- text, image, video, pdf, location, product, route
    content TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indices
CREATE INDEX idx_stores_location ON stores USING GIST (location);
CREATE INDEX idx_stores_name_trgm ON stores USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_tags_gin ON products USING GIN (search_tags jsonb_path_ops);
CREATE INDEX idx_chat_history_chat_id ON chat_history (chat_id);
CREATE INDEX idx_etalovers_android_id ON etalovers (android_id);
CREATE INDEX idx_chat_threads_user ON chat_threads (user_eid);
CREATE INDEX idx_chat_threads_store ON chat_threads (store_sid);
CREATE INDEX idx_chat_messages_thread ON chat_messages (thread_id);
CREATE INDEX idx_chat_messages_created ON chat_messages (created_at);
CREATE INDEX idx_user_addresses_eid ON user_addresses (eid);
CREATE INDEX idx_stores_vacation_mode ON stores (vacation_mode);

-- 4. Functions & Triggers

-- Automatic Store Rating Stats Sync
CREATE OR REPLACE FUNCTION update_store_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE stores
        SET 
            average_rating = (SELECT COALESCE(AVG(stars), 0) FROM reviews WHERE sid = NEW.sid),
            total_reviews = (SELECT COUNT(*) FROM reviews WHERE sid = NEW.sid)
        WHERE sid = NEW.sid;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE stores
        SET 
            average_rating = (SELECT COALESCE(AVG(stars), 0) FROM reviews WHERE sid = OLD.sid),
            total_reviews = (SELECT COUNT(*) FROM reviews WHERE sid = OLD.sid)
        WHERE sid = OLD.sid;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_store_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_store_rating_stats();

-- 5. Permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dietalase_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dietalase_user;
-- System Backups Table
CREATE TABLE IF NOT EXISTS system_backups (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_location VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
