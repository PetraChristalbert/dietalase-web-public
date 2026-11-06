CREATE TABLE public.chat_history (
    id integer NOT NULL,
    chat_id character varying(255),
    role character varying(50),
    content text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.chatgpt_order (
    "No" integer NOT NULL,
    order_id text,
    variant character varying(50),
    price integer,
    status character varying(15),
    phone_number character varying(20),
    email_address character varying(100),
    order_date timestamp with time zone,
    referral_code character varying(100),
    referral_paid character varying(50)
);

CREATE TABLE public.chatgpt_pending (
    "No" integer NOT NULL,
    order_id text,
    variant character varying(50),
    price integer,
    status character varying(15),
    phone_number character varying(20),
    email_address character varying(100),
    order_date timestamp with time zone,
    referral_code character varying(100),
    referral_paid character varying(50)
);

CREATE TABLE public.chatgpt_referral (
    id integer NOT NULL,
    payment_method character varying(100),
    phone_number character varying(20)
);

CREATE TABLE public.etalovers (
    eid integer NOT NULL,
    google_id character varying(100),
    firebase_id character varying(255),
    fcm_token character varying(255),
    android_id character varying(255),
    name character varying(100) DEFAULT 'User Baru'::character varying,
    image text,
    theme character varying(15) DEFAULT 'Light'::character varying,
    latitude double precision DEFAULT '0'::double precision,
    longitude double precision DEFAULT '0'::double precision
);

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);

CREATE TABLE public.login (
    contact character varying(20) NOT NULL,
    code character varying(10),
    sent character varying(10) DEFAULT 'false'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.pending_stores (
    ticket_id integer NOT NULL,
    name character varying(100),
    type character varying(50),
    address text,
    city character varying(100),
    location public.geography(Point,4326),
    google_id character varying(100),
    image text,
    contact character varying(20),
    owner_name character varying(100),
    owner_image text,
    firebase_id character varying(255),
    fcm_token character varying(255),
    android_id character varying(255)
);

CREATE TABLE public.products (
    pid integer NOT NULL,
    sid integer,
    name character varying(150),
    price numeric(15,2),
    unit character varying(50),
    description text,
    image text,
    video text,
    description_ai text,
    vector text
);

CREATE TABLE public.registration (
    contact character varying(20) NOT NULL,
    code character varying(10),
    sent character varying(10) DEFAULT 'false'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.reviews (
    id integer NOT NULL,
    sid integer,
    eid integer,
    stars numeric(2,1),
    comment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.store_operating_hours (
    id integer NOT NULL,
    sid integer,
    day_of_week integer,
    open_time time without time zone,
    close_time time without time zone
);

CREATE TABLE public.store_subscription_pending (
    order_id character varying(255) NOT NULL,
    sid integer,
    product character varying(50),
    subscription_type integer,
    price numeric(15,2),
    status character varying(15) DEFAULT 'Pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.store_subscription_settlement (
    order_id character varying(255) NOT NULL,
    sid integer,
    product character varying(50),
    subscription_type integer,
    price numeric(15,2),
    transaction_id character varying(255),
    settled_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    subscription_end date
);

CREATE TABLE public.stores (
    sid integer NOT NULL,
    name character varying(100),
    type character varying(50),
    address text,
    city character varying(100),
    location public.geography(Point,4326),
    google_id character varying(100),
    image text,
    contact character varying(20),
    owner_name character varying(100),
    owner_image text,
    subscription integer DEFAULT 1,
    instagram character varying(255),
    tiktok character varying(255),
    facebook character varying(255),
    youtube character varying(255),
    x_account character varying(255),
    email character varying(255),
    firebase_id character varying(255),
    fcm_token text,
    android_id character varying(255),
    joined_at date,
    vector text,
    description text,
    description_ai text,
    country character varying(100) DEFAULT 'Indonesia'::character varying NOT NULL,
    avg_rating numeric(2,1) DEFAULT 0.0,
    total_visits integer DEFAULT 0
);

CREATE TABLE public.user_saved_products (
    eid integer NOT NULL,
    pid integer NOT NULL,
    saved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.user_saved_stores (
    eid integer NOT NULL,
    sid integer NOT NULL,
    saved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.visits (
    vid character varying(255) NOT NULL,
    eid integer,
    pid integer,
    sid integer,
    source character varying(255) DEFAULT 'direct'::character varying,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.whatsapp_messages (
    id integer NOT NULL,
    phone_number character varying(20),
    message text,
    scheduled_at timestamp with time zone,
    sent boolean DEFAULT false,
    sent_at timestamp with time zone
);

CREATE INDEX chat_history_chat_id_index ON public.chat_history USING btree (chat_id);

ALTER TABLE ONLY public.chat_history ALTER COLUMN id SET DEFAULT nextval('public.chat_history_id_seq'::regclass);

ALTER TABLE ONLY public.chatgpt_order ALTER COLUMN "No" SET DEFAULT nextval('public."chatgpt_order_No_seq"'::regclass);

ALTER TABLE ONLY public.chatgpt_pending ALTER COLUMN "No" SET DEFAULT nextval('public."chatgpt_pending_No_seq"'::regclass);

ALTER TABLE ONLY public.chatgpt_referral ALTER COLUMN id SET DEFAULT nextval('public.chatgpt_referral_id_seq'::regclass);

ALTER TABLE ONLY public.etalovers ALTER COLUMN eid SET DEFAULT nextval('public.etalovers_eid_seq'::regclass);

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);

ALTER TABLE ONLY public.pending_stores ALTER COLUMN ticket_id SET DEFAULT nextval('public.pending_stores_ticket_id_seq'::regclass);

ALTER TABLE ONLY public.products ALTER COLUMN pid SET DEFAULT nextval('public.products_pid_seq'::regclass);

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);

ALTER TABLE ONLY public.store_operating_hours ALTER COLUMN id SET DEFAULT nextval('public.store_operating_hours_id_seq'::regclass);

ALTER TABLE ONLY public.stores ALTER COLUMN sid SET DEFAULT nextval('public.stores_sid_seq'::regclass);

ALTER TABLE ONLY public.whatsapp_messages ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_messages_id_seq'::regclass);

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT chat_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chatgpt_order
    ADD CONSTRAINT chatgpt_order_pkey PRIMARY KEY ("No");

ALTER TABLE ONLY public.chatgpt_pending
    ADD CONSTRAINT chatgpt_pending_pkey PRIMARY KEY ("No");

ALTER TABLE ONLY public.chatgpt_referral
    ADD CONSTRAINT chatgpt_referral_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.etalovers
    ADD CONSTRAINT etalovers_pkey PRIMARY KEY (eid);

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.login
    ADD CONSTRAINT login_pkey PRIMARY KEY (contact);

ALTER TABLE ONLY public.pending_stores
    ADD CONSTRAINT pending_stores_pkey PRIMARY KEY (ticket_id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (pid);

ALTER TABLE ONLY public.registration
    ADD CONSTRAINT registration_pkey PRIMARY KEY (contact);

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.store_operating_hours
    ADD CONSTRAINT store_operating_hours_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.store_operating_hours
    ADD CONSTRAINT store_operating_hours_sid_day_of_week_unique UNIQUE (sid, day_of_week);

ALTER TABLE ONLY public.store_subscription_pending
    ADD CONSTRAINT store_subscription_pending_pkey PRIMARY KEY (order_id);

ALTER TABLE ONLY public.store_subscription_settlement
    ADD CONSTRAINT store_subscription_settlement_pkey PRIMARY KEY (order_id);

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (sid);

ALTER TABLE ONLY public.user_saved_products
    ADD CONSTRAINT user_saved_products_pkey PRIMARY KEY (eid, pid);

ALTER TABLE ONLY public.user_saved_stores
    ADD CONSTRAINT user_saved_stores_pkey PRIMARY KEY (eid, sid);

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (vid);

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sid_foreign FOREIGN KEY (sid) REFERENCES public.stores(sid) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_eid_foreign FOREIGN KEY (eid) REFERENCES public.etalovers(eid) ON DELETE SET NULL;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_sid_foreign FOREIGN KEY (sid) REFERENCES public.stores(sid) ON DELETE CASCADE;

ALTER TABLE ONLY public.store_operating_hours
    ADD CONSTRAINT store_operating_hours_sid_foreign FOREIGN KEY (sid) REFERENCES public.stores(sid) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_saved_products
    ADD CONSTRAINT user_saved_products_eid_foreign FOREIGN KEY (eid) REFERENCES public.etalovers(eid) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_saved_products
    ADD CONSTRAINT user_saved_products_pid_foreign FOREIGN KEY (pid) REFERENCES public.products(pid) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_saved_stores
    ADD CONSTRAINT user_saved_stores_eid_foreign FOREIGN KEY (eid) REFERENCES public.etalovers(eid) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_saved_stores
    ADD CONSTRAINT user_saved_stores_sid_foreign FOREIGN KEY (sid) REFERENCES public.stores(sid) ON DELETE CASCADE;

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_eid_foreign FOREIGN KEY (eid) REFERENCES public.etalovers(eid) ON DELETE CASCADE;

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pid_foreign FOREIGN KEY (pid) REFERENCES public.products(pid) ON DELETE CASCADE;

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_sid_foreign FOREIGN KEY (sid) REFERENCES public.stores(sid) ON DELETE CASCADE;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

CREATE SEQUENCE public.chat_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public."chatgpt_order_No_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public."chatgpt_pending_No_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.chatgpt_referral_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.etalovers_eid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.pending_stores_ticket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.products_pid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.store_operating_hours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.stores_sid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.whatsapp_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.chat_history_id_seq OWNER TO svc_user_k9b3;

ALTER SEQUENCE public.chat_history_id_seq OWNED BY public.chat_history.id;

ALTER SEQUENCE public."chatgpt_order_No_seq" OWNER TO svc_user_k9b3;

ALTER SEQUENCE public."chatgpt_order_No_seq" OWNED BY public.chatgpt_order."No";

ALTER SEQUENCE public."chatgpt_pending_No_seq" OWNER TO svc_user_k9b3;

ALTER SEQUENCE public."chatgpt_pending_No_seq" OWNED BY public.chatgpt_pending."No";

ALTER SEQUENCE public.chatgpt_referral_id_seq OWNER TO svc_user_k9b3;

ALTER SEQUENCE public.chatgpt_referral_id_seq OWNED BY public.chatgpt_referral.id;

ALTER SEQUENCE public.etalovers_eid_seq OWNER TO svc_user_k9b3;

ALTER SEQUENCE public.etalovers_eid_seq OWNED BY public.etalovers.eid;

ALTER SEQUENCE public.knex_migrations_id_seq OWNER TO svc_user_k9b3;

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNER TO svc_user_k9b3;

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;

ALTER SEQUENCE public.pending_stores_ticket_id_seq OWNER TO svc_user_k9b3;

ALTER SEQUENCE public.pending_stores_ticket_id_seq OWNED BY public.pending_stores.ticket_id;

ALTER SEQUENCE public.products_pid_seq OWNER TO svc_user_k9b3;

ALTER SEQUENCE public.products_pid_seq OWNED BY public.products.pid;

ALTER SEQUENCE public.reviews_id_seq OWNER TO svc_user_k9b3;

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;

ALTER SEQUENCE public.store_operating_hours_id_seq OWNER TO svc_user_k9b3;

ALTER SEQUENCE public.store_operating_hours_id_seq OWNED BY public.store_operating_hours.id;

ALTER SEQUENCE public.stores_sid_seq OWNER TO svc_user_k9b3;

ALTER SEQUENCE public.stores_sid_seq OWNED BY public.stores.sid;

ALTER SEQUENCE public.whatsapp_messages_id_seq OWNER TO svc_user_k9b3;

ALTER SEQUENCE public.whatsapp_messages_id_seq OWNED BY public.whatsapp_messages.id;

SELECT pg_catalog.setval('public.chat_history_id_seq', 112, true);

SELECT pg_catalog.setval('public."chatgpt_order_No_seq"', 1, false);

SELECT pg_catalog.setval('public."chatgpt_pending_No_seq"', 1, false);

SELECT pg_catalog.setval('public.chatgpt_referral_id_seq', 1, false);

SELECT pg_catalog.setval('public.etalovers_eid_seq', 15, true);

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 81, true);

SELECT pg_catalog.setval('public.knex_migrations_lock_index_seq', 1, true);

SELECT pg_catalog.setval('public.pending_stores_ticket_id_seq', 8, true);

SELECT pg_catalog.setval('public.products_pid_seq', 820, true);

SELECT pg_catalog.setval('public.reviews_id_seq', 1, false);

SELECT pg_catalog.setval('public.store_operating_hours_id_seq', 1, false);

SELECT pg_catalog.setval('public.stores_sid_seq', 100, true);

SELECT pg_catalog.setval('public.whatsapp_messages_id_seq', 1, false);

