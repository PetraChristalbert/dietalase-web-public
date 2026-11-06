CREATE TABLE public.chat_history (
    id integer NOT NULL,
    chat_id character varying(255),
    role character varying(50),
    content text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.chat_history OWNER TO svc_user_k9b3;

--
-- TOC entry 236 (class 1259 OID 18357)
-- Name: chat_history_id_seq; Type: SEQUENCE; Schema: public; Owner: svc_user_k9b3
--

CREATE SEQUENCE public.chat_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
--
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


ALTER TABLE public.chatgpt_order OWNER TO svc_user_k9b3;

--
-- TOC entry 242 (class 1259 OID 18393)
-- Name: chatgpt_order_No_seq; Type: SEQUENCE; Schema: public; Owner: svc_user_k9b3
--

--
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


ALTER TABLE public.chatgpt_pending OWNER TO svc_user_k9b3;

--
-- TOC entry 244 (class 1259 OID 18402)
-- Name: chatgpt_pending_No_seq; Type: SEQUENCE; Schema: public; Owner: svc_user_k9b3
--

--
CREATE TABLE public.chatgpt_referral (
    id integer NOT NULL,
    payment_method character varying(100),
    phone_number character varying(20)
);


ALTER TABLE public.chatgpt_referral OWNER TO svc_user_k9b3;

--
-- TOC entry 246 (class 1259 OID 18411)
-- Name: chatgpt_referral_id_seq; Type: SEQUENCE; Schema: public; Owner: svc_user_k9b3
--

CREATE SEQUENCE public.chatgpt_referral_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
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


ALTER TABLE public.etalovers OWNER TO svc_user_k9b3;

--
-- TOC entry 221 (class 1259 OID 18210)
-- Name: etalovers_eid_seq; Type: SEQUENCE; Schema: public; Owner: svc_user_k9b3
--

--
CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.knex_migrations OWNER TO svc_user_k9b3;

--
-- TOC entry 215 (class 1259 OID 17425)
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: svc_user_k9b3
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
--
CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.knex_migrations_lock OWNER TO svc_user_k9b3;

--
-- TOC entry 217 (class 1259 OID 17432)
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: svc_user_k9b3
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
CREATE TABLE public.login (
    contact character varying(20) NOT NULL,
    code character varying(10),
    sent character varying(10) DEFAULT 'false'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.login OWNER TO svc_user_k9b3;

--
-- TOC entry 233 (class 1259 OID 18333)
-- Name: pending_stores; Type: TABLE; Schema: public; Owner: svc_user_k9b3
--

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


ALTER TABLE public.pending_stores OWNER TO svc_user_k9b3;

--
--
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


ALTER TABLE public.products OWNER TO svc_user_k9b3;

--
-- TOC entry 223 (class 1259 OID 18225)
-- Name: products_pid_seq; Type: SEQUENCE; Schema: public; Owner: svc_user_k9b3
--

--
CREATE TABLE public.registration (
    contact character varying(20) NOT NULL,
    code character varying(10),
    sent character varying(10) DEFAULT 'false'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.registration OWNER TO svc_user_k9b3;

--
-- TOC entry 226 (class 1259 OID 18242)
-- Name: reviews; Type: TABLE; Schema: public; Owner: svc_user_k9b3
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    sid integer,
    eid integer,
    stars numeric(2,1),
    comment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reviews OWNER TO svc_user_k9b3;

--
-- TOC entry 225 (class 1259 OID 18241)
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: svc_user_k9b3
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
--
CREATE TABLE public.store_operating_hours (
    id integer NOT NULL,
    sid integer,
    day_of_week integer,
    open_time time without time zone,
    close_time time without time zone
);


ALTER TABLE public.store_operating_hours OWNER TO svc_user_k9b3;

--
-- TOC entry 227 (class 1259 OID 18262)
-- Name: store_operating_hours_id_seq; Type: SEQUENCE; Schema: public; Owner: svc_user_k9b3
--

CREATE SEQUENCE public.store_operating_hours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
--
CREATE TABLE public.store_subscription_pending (
    order_id character varying(255) NOT NULL,
    sid integer,
    product character varying(50),
    subscription_type integer,
    price numeric(15,2),
    status character varying(15) DEFAULT 'Pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.store_subscription_pending OWNER TO svc_user_k9b3;

--
-- TOC entry 241 (class 1259 OID 18385)
-- Name: store_subscription_settlement; Type: TABLE; Schema: public; Owner: svc_user_k9b3
--

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


ALTER TABLE public.store_subscription_settlement OWNER TO svc_user_k9b3;

--
-- TOC entry 220 (class 1259 OID 18199)
-- Name: stores; Type: TABLE; Schema: public; Owner: svc_user_k9b3
--

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
--
CREATE TABLE public.user_saved_products (
    eid integer NOT NULL,
    pid integer NOT NULL,
    saved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_saved_products OWNER TO svc_user_k9b3;

--
-- TOC entry 230 (class 1259 OID 18292)
-- Name: user_saved_stores; Type: TABLE; Schema: public; Owner: svc_user_k9b3
--

CREATE TABLE public.user_saved_stores (
    eid integer NOT NULL,
    sid integer NOT NULL,
    saved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_saved_stores OWNER TO svc_user_k9b3;

--
-- TOC entry 231 (class 1259 OID 18308)
-- Name: visits; Type: TABLE; Schema: public; Owner: svc_user_k9b3
--

CREATE TABLE public.visits (
    vid character varying(255) NOT NULL,
    eid integer,
    pid integer,
    sid integer,
    source character varying(255) DEFAULT 'direct'::character varying,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.visits OWNER TO svc_user_k9b3;

--
-- TOC entry 239 (class 1259 OID 18369)
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: svc_user_k9b3
--

CREATE TABLE public.whatsapp_messages (
    id integer NOT NULL,
    phone_number character varying(20),
    message text,
    scheduled_at timestamp with time zone,
    sent boolean DEFAULT false,
    sent_at timestamp with time zone
);


ALTER TABLE public.whatsapp_messages OWNER TO svc_user_k9b3;

--
-- TOC entry 238 (class 1259 OID 18368)
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: svc_user_k9b3
--

CREATE SEQUENCE public.whatsapp_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
