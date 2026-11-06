BEGIN;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1001,
        'Toko Kelontong Berkah Abadi',
        'Grocery',
        'Jl. Fatmawati Raya No. 12, Cilandak Barat',
        'Jakarta Selatan',
        ST_SetSRID(ST_MakePoint(106.8006, -6.2444), 4326),
        'https://dietalase.com/Assets/Store_Image/1001_storeImage.webp',
        '081298765432',
        'Haji Ahmad Sobari',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'berkah.abadi@gmail.com',
        'Menyediakan segala jenis kebutuhan pokok, sembako, dan keperluan rumah tangga sehari-hari dengan pelayanan ramah.',
        4.7,
        1420
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10001,
                1001,
                'Kecap Manis Bango 520ml',
                24500,
                'pcs',
                'Kecap manis pilihan keluarga Indonesia yang terbuat dari kedelai hitam berkualitas tinggi.',
                'https://dietalase.com/Assets/Product_Image/10001_productImage.webp',
                7,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10002,
                1001,
                'Indomie Goreng Spesial (1 Dus / 40 Pcs)',
                118000,
                'box',
                'Paket karton ekonomis mi instan goreng terfavorit di Indonesia, cocok untuk stok rumah tangga atau usaha.',
                'https://dietalase.com/Assets/Product_Image/10002_productImage.webp',
                8,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10003,
                1001,
                'Beras Setra Ramos Premium 10kg',
                145000,
                'pack',
                'Beras lokal premium Setra Ramos, menghasilkan nasi yang pulen, putih alami, dan beraroma harum tanpa pemutih.',
                'https://dietalase.com/Assets/Product_Image/10003_productImage.webp',
                2,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1002,
        'Selasar Kopi & Roastery',
        'Food & Beverage',
        'Jl. Boulevard Barat Raya Blok LC7 No. 12, Kelapa Gading',
        'Jakarta Utara',
        ST_SetSRID(ST_MakePoint(106.9, -6.162), 4326),
        'https://dietalase.com/Assets/Store_Image/1002_storeImage.webp',
        '081122334455',
        'Kevin Wijaya',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'hello@selasarkopi.com',
        'Artisan coffee shop dan roastery lokal yang menyajikan biji kopi nusantara pilihan pilihan dengan teknik brewing terbaik.',
        4.9,
        3210
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10004,
                1002,
                'Es Kopi Susu Gula Aren',
                22000,
                'cup',
                'Espresso blend spesial dicampur dengan susu segar dan sirup gula aren murni khas Indonesia, disajikan dingin.',
                'https://dietalase.com/Assets/Product_Image/10004_productImage.webp',
                7,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10005,
                1002,
                'Croissant Almond Premium',
                28000,
                'pcs',
                'Pastry Prancis klasik yang renyah di luar dan lembut di dalam, dengan isian krim almond melimpah dan taburan kacang almond panggang.',
                'https://dietalase.com/Assets/Product_Image/10005_productImage.webp',
                8,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10006,
                1002,
                'Biji Kopi Arabika Gayo 250g',
                85000,
                'pack',
                'Biji kopi sangrai (whole beans) Arabika Aceh Gayo dengan profil sangrai medium, memiliki notes cokelat hitam dan rempah.',
                'https://dietalase.com/Assets/Product_Image/10006_productImage.webp',
                2,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1003,
        'Svarna Batik Heritage',
        'Fashion',
        'Ruko Puri Indah Blok A No. 5, Kembangan Selatan',
        'Jakarta Barat',
        ST_SetSRID(ST_MakePoint(106.7362, -6.1872), 4326),
        'https://dietalase.com/Assets/Store_Image/1003_storeImage.webp',
        '085711223344',
        'Citra Lestari',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'info@svarnabatik.id',
        'Butik premium yang melestarikan warisan budaya melalui koleksi pakaian batik tulis dan cap modern dengan material sutra dan katun berkualitas tinggi.',
        4.8,
        850
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10007,
                1003,
                'Kemeja Batik Tulis Sutra Men',
                1250000,
                'pcs',
                'Kemeja lengan panjang pria berbahan sutra eksklusif dengan motif batik tulis pesisiran yang dibuat handmade oleh pengrajin ahli.',
                'https://dietalase.com/Assets/Product_Image/10007_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10008,
                1003,
                'Kain Batik Cap Katun Prima (2 Meter)',
                180000,
                'pcs',
                'Lembaran kain katun prima halus berukuran 2x1.15 meter dengan motif megamendung, nyaman dipakai untuk bahan kemeja atau terusan.',
                'https://dietalase.com/Assets/Product_Image/10008_productImage.webp',
                1,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1004,
        'Delta Elektronik & Service Komputer',
        'Electronics',
        'Jl. Margonda Raya No. 45, Beji (Bordering South Jakarta)',
        'Depok',
        ST_SetSRID(ST_MakePoint(106.8322, -6.3724), 4326),
        'https://dietalase.com/Assets/Store_Image/1004_storeImage.webp',
        '081344556677',
        'Rian Hidayat',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'delta.elektronik@yahoo.com',
        'Pusat penjualan komponen komputer, aksesoris gawai, serta layanan perbaikan (service) hardware dan software bergaransi.',
        4.4,
        2150
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10009,
                1004,
                'Smart Power Strip 4 Sockets + 3 USB',
                165000,
                'pcs',
                'Colokan listrik pintar dengan 4 slot universal dan 3 port USB fast charging, dilengkapi proteksi konsleting dan kendali saklar otomatis.',
                'https://dietalase.com/Assets/Product_Image/10009_productImage.webp',
                9,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10010,
                1004,
                'Solder Listrik Adjustable 60W Kit',
                75000,
                'pack',
                'Paket alat solder listrik 60 Watt dengan pengatur suhu, lengkap dengan 5 mata solder cadangan, dudukan, dan timah solder.',
                'https://dietalase.com/Assets/Product_Image/10010_productImage.webp',
                5,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1005,
        'CV Citra Mandiri Snack (Wholesale Factory)',
        'Manufacturing & Wholesale',
        'Kawasan Industri Pulogadung, Jl. Rawa Terate II No. 15',
        'Jakarta Timur',
        ST_SetSRID(ST_MakePoint(106.91, -6.195), 4326),
        'https://dietalase.com/Assets/Store_Image/1005_storeImage.webp',
        '0214601234',
        'Hendra Wijaya, SE',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'sales@citramandirisnack.co.id',
        'Pabrik dan supplier berskala UMKM-Plus yang memproduksi aneka keripik tradisional dan camilan nusantara dalam jumlah besar (grosir) untuk pasokan ritel.',
        4.6,
        4890
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10011,
                1005,
                'Keripik Singkong Balado Pedas (Karton Grosir 5kg)',
                320000,
                'box',
                'Pasokan grosir keripik singkong balado bumbu basah merah merona kemasan dus besar 5kg, renyah dan tanpa pengawet buatan.',
                'https://dietalase.com/Assets/Product_Image/10011_productImage.webp',
                5,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10012,
                1005,
                'Kacang Bawang Goreng Gurih 1kg',
                62000,
                'pack',
                'Kacang tanah kupas goreng dengan bumbu bawang putih asli yang melimpah dan irisan daun jeruk, dikemas vakum agar tetap renyah.',
                'https://dietalase.com/Assets/Product_Image/10012_productImage.webp',
                7,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1006,
        'Apotek Jaya Medika',
        'Health & Beauty',
        'Jl. Salemba Raya No. 28, Senen',
        'Jakarta Pusat',
        ST_SetSRID(ST_MakePoint(106.8521, -6.1912), 4326),
        'https://dietalase.com/Assets/Store_Image/1006_storeImage.webp',
        '0213901234',
        'Siti Aminah, S.Farm.',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'jayamedika.apotek@gmail.com',
        'Melayani kebutuhan obat resep, vitamin, suplemen kesehatan, dan alat kesehatan habis pakai dengan keaslian produk terjamin.',
        4.6,
        1850
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10013,
                1006,
                'Sangobion Caps (Box isi 25 Strip)',
                115000,
                'box',
                'Suplemen penambah darah dengan zat besi dan vitamin untuk mengatasi anemia akibat kekurangan zat besi.',
                'https://dietalase.com/Assets/Product_Image/10013_productImage.webp',
                8,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10014,
                1006,
                'Termometer Digital Omron Eco Temp Smart',
                145000,
                'pcs',
                'Alat pengukur suhu tubuh digital dengan ujung fleksibel, hasil akurat dan cepat untuk bayi dan dewasa.',
                'https://dietalase.com/Assets/Product_Image/10014_productImage.webp',
                7,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1007,
        'Bengkel Motor Perkasa Jaya',
        'Automotive',
        'Jl. Raya Serpong No. 88, Pondok Jagung',
        'Tangerang Selatan',
        ST_SetSRID(ST_MakePoint(106.6663, -6.2515), 4326),
        'https://dietalase.com/Assets/Store_Image/1007_storeImage.webp',
        '081288889999',
        'Agus Riyadi',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'perkasajayabengkel@yahoo.com',
        'Servis rutin, turun mesin, ganti oli, dan penyediaan suku cadang motor matic dan bebek terlengkap.',
        4.5,
        920
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10015,
                1007,
                'Oli Mesin Shell Advance AX7 Scooter 1L',
                68000,
                'pcs',
                'Oli motor matic sintetik performa tinggi untuk akselerasi mulus dan perlindungan mesin optimal.',
                'https://dietalase.com/Assets/Product_Image/10015_productImage.webp',
                7,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10016,
                1007,
                'Ban Motor Tubeless Maxxis Victra S98 90/90-14',
                310000,
                'pcs',
                'Ban tubeless motor matic ukuran 14 inci dengan pola grip sport untuk performa maksimal di jalan basah dan kering.',
                'https://dietalase.com/Assets/Product_Image/10016_productImage.webp',
                3,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1008,
        'CV Jati Luhur Furniture',
        'Furniture & Home Living',
        'Jl. Kalimalang Raya Blok G9 No. 4, Duren Sawit',
        'Jakarta Timur',
        ST_SetSRID(ST_MakePoint(106.915, -6.241), 4326),
        'https://dietalase.com/Assets/Store_Image/1008_storeImage.webp',
        '02186604321',
        'Bambang Trimulyo',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'sales@jatiluhur-furniture.co.id',
        'Produsen dan distributor perabot kayu jati asli jepara dan furnitur minimalis modern untuk rumah tangga dan kantor.',
        4.8,
        540
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10017,
                1008,
                'Meja Makan Kayu Jati Solid 4 Kursi',
                4200000,
                'pcs',
                'Satu set meja makan keluarga berbahan 100% kayu jati solid dengan finishing melamin natural rustik, termasuk 4 kursi empuk.',
                'https://dietalase.com/Assets/Product_Image/10017_productImage.webp',
                2,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10018,
                1008,
                'Kursi Kerja Kantor Ergonomis Mesh',
                850000,
                'pcs',
                'Kursi kantor dengan penopang lumbar, sandaran jaring (mesh) anti gerah, hidrolik pengatur tinggi, dan roda nilon halus.',
                'https://dietalase.com/Assets/Product_Image/10018_productImage.webp',
                6,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1009,
        'Rumah Makan Minang Sayo',
        'Food & Beverage',
        'Jl. KH. Mas Mansyur No. 102, Tanah Abang',
        'Jakarta Pusat',
        ST_SetSRID(ST_MakePoint(106.8148, -6.1925), 4326),
        'https://dietalase.com/Assets/Store_Image/1009_storeImage.webp',
        '081377771234',
        'Uni Syamsul',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'minangsayo.culinary@gmail.com',
        'Menyajikan masakan otentik Minang cita rasa asli dengan bumbu rempah melimpah yang diwariskan turun-temurun.',
        4.7,
        4120
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10019,
                1009,
                'Paket Nasi Rendang Daging Sapi Murni',
                28000,
                'pack',
                'Nasi rames khas Padang dengan lauk utama satu potong rendang daging sapi empuk, kuah gulai, sayur nangka, dan sambal ijo.',
                'https://dietalase.com/Assets/Product_Image/10019_productImage.webp',
                7,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10020,
                1009,
                'Rendang Daging Sapi Kemasan Vakum 500g',
                160000,
                'pack',
                'Rendang daging sapi otentik isi 5-6 potong yang dikemas vakum higienis, tahan lama tanpa pengawet, cocok untuk oleh-oleh atau stok travel.',
                'https://dietalase.com/Assets/Product_Image/10020_productImage.webp',
                10,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1010,
        'Lestari Hydroponic Urban Farm',
        'Grocery',
        'Jl. Kembangan Raya No. 42, Kembangan Utara',
        'Jakarta Barat',
        ST_SetSRID(ST_MakePoint(106.7289, -6.1722), 4326),
        'https://dietalase.com/Assets/Store_Image/1010_storeImage.webp',
        '081922446688',
        'Dian Sastrowijoyo',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'info@lestarihydro.farm',
        'Kebun perkotaan hidroponik modern yang memproduksi sayuran segar bebas pestisida secara harian langsung untuk masyarakat perkotaan.',
        4.9,
        680
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10021,
                1010,
                'Sayur Selada Hidroponik Segar 250g',
                12000,
                'pack',
                'Sayur selada keriting hijau segar dipanen langsung dari kebun hidroponik bersama akarnya untuk menjaga kesegaran optimal.',
                'https://dietalase.com/Assets/Product_Image/10021_productImage.webp',
                3,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10022,
                1010,
                'Nutrisi Hidroponik AB Mix Sayuran Daun 1L',
                35000,
                'pack',
                'Paket pupuk konsentrat nutrisi makro dan mikro khusus tanaman sayuran daun untuk sistem budidaya hidroponik.',
                'https://dietalase.com/Assets/Product_Image/10022_productImage.webp',
                7,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1011,
        'PT Sinar Utama Plastik (Industrial Packaging)',
        'Manufacturing & Wholesale',
        'Kawasan Industri Daan Mogot Km. 19, Kalideres',
        'Jakarta Barat',
        ST_SetSRID(ST_MakePoint(106.6984, -6.1421), 4326),
        'https://dietalase.com/Assets/Store_Image/1011_storeImage.webp',
        '0215432109',
        'Ir. Haryanto Wijaya',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'sales@sinarutamaplastik.co.id',
        'Pabrik manufaktur skala besar yang memproduksi berbagai jenis kemasan plastik fleksibel, bubble wrap, dan plastik shrink berkualitas industri.',
        4.5,
        3110
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10023,
                1011,
                'Bubble Wrap Roll Premium 1.25m x 50m',
                145000,
                'roll',
                'Gulungan besar bubble wrap pelindung packing kualitas premium, gelembung tebal tidak gampang pecah, cocok untuk logistik e-commerce.',
                'https://dietalase.com/Assets/Product_Image/10023_productImage.webp',
                8,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10024,
                1011,
                'Plastik Stretch Film Wrapping 50cm x 300m',
                58000,
                'roll',
                'Plastik wrapping pembungkus palet barang (stretch film) elastis, daya rekat kuat, melindung barang dari debu dan kelembapan saat pengiriman.',
                'https://dietalase.com/Assets/Product_Image/10024_productImage.webp',
                6,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1012,
        'Paws & Claws Pet Zone',
        'Pet Supplies',
        'Jl. Kemang Raya No. 14B, Mampang Prapatan',
        'Jakarta Selatan',
        ST_SetSRID(ST_MakePoint(106.8102, -6.275), 4326),
        'https://dietalase.com/Assets/Store_Image/1012_storeImage.webp',
        '081233445566',
        'Amanda Putri',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'contact@pawsclaws.id',
        'Supermarket dan pet shop terlengkap yang menyediakan pakan premium, aksesoris unik, serta layanan grooming profesional untuk hewan kesayangan Anda.',
        4.8,
        1940
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10025,
                1012,
                'Whiskas Dry Adult Cat Food Chicken 1.2kg',
                67000,
                'pcs',
                'Makanan kucing kering bernutrisi lengkap rasa ayam untuk kucing dewasa usia 1 tahun ke atas, menjaga kesehatan bulu dan penglihatan.',
                'https://dietalase.com/Assets/Product_Image/10025_productImage.webp',
                7,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10026,
                1012,
                'Pasir Kucing Gumpal Bentonit Wangi Lavender 10L',
                55000,
                'pack',
                'Pasir kucing gumpal higienis berbahan bentonit alami dengan aroma terapi lavender, daya serap cairan tinggi dan efektif mengunci bau kotoran.',
                'https://dietalase.com/Assets/Product_Image/10026_productImage.webp',
                6,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1013,
        'TB Sinar Mas Bangunan',
        'Building Materials',
        'Jl. Raya Kalimalang No. 104, Jaticempaka',
        'Bekasi',
        ST_SetSRID(ST_MakePoint(106.9753, -6.2384), 4326),
        'https://dietalase.com/Assets/Store_Image/1013_storeImage.webp',
        '0218861234',
        'Hendra Setiawan',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'sinarmasbangunan@gmail.com',
        'Supplier bahan bangunan terlengkap melayani proyek konstruksi maupun renovasi rumah, menyediakan semen, besi beton, cat dinding, dan pipa universal.',
        4.4,
        1560
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10027,
                1013,
                'Semen Tiga Roda Portland Pozzolan 50kg',
                64000,
                'pack',
                'Semen PC berkualitas tinggi kemasan 50kg, menghasilkan adukan yang lebih rapat, halus, dan tahan lama untuk pengerjaan beton dan plesteran.',
                'https://dietalase.com/Assets/Product_Image/10027_productImage.webp',
                1,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10028,
                1013,
                'Cat Tembok Dulux Catylac Interior Putih 5kg',
                165000,
                'pcs',
                'Cat dinding interior formula khusus dengan teknologi anti-pudar, memberikan hasil akhir matt yang cerah, daya tutup cat sangat tinggi.',
                'https://dietalase.com/Assets/Product_Image/10028_productImage.webp',
                10,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1014,
        'Patisserie Rasa Sayang',
        'Food & Beverage',
        'Jl. Senopati No. 67, Selong, Kebayoran Baru',
        'Jakarta Selatan',
        ST_SetSRID(ST_MakePoint(106.801, -6.225), 4326),
        'https://dietalase.com/Assets/Store_Image/1014_storeImage.webp',
        '081599887766',
        'Chef Natasha Putri',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'orders@rasasayangbakery.com',
        'Premium artisan bakery yang memproduksi kue ulang tahun custom, roti jadul mentega premium, dan dessert box kontemporer secara segar setiap pagi.',
        4.9,
        2480
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10029,
                1014,
                'Roti Sisir Mentega Wisjman Premium',
                38000,
                'pcs',
                'Roti sisir tradisional bertekstur sangat lembut beraroma harum, menggunakan olesan mentega Wisjman murni berlimpah yang gurih manis.',
                'https://dietalase.com/Assets/Product_Image/10029_productImage.webp',
                5,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10030,
                1014,
                'Classic New York Cheesecake Whole (D-18cm)',
                275000,
                'pcs',
                'Kue keju panggang klasik gaya New York berdiameter 18cm, tekstur creamy padat dengan lapisan renyah biskuit graham cracker di bawahnya.',
                'https://dietalase.com/Assets/Product_Image/10030_productImage.webp',
                8,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1015,
        'Kreatif Sablon & Konveksi (MSME Garment)',
        'Manufacturing & Wholesale',
        'Jl. Cipinang Muara III No. 42, Jatinegara',
        'Jakarta Timur',
        ST_SetSRID(ST_MakePoint(106.9024, -6.2115), 4326),
        'https://dietalase.com/Assets/Store_Image/1015_storeImage.webp',
        '087812345678',
        'Rahmat Hidayat',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'kreatifsablon.mfg@gmail.com',
        'Rumah produksi konveksi sandang yang melayani sablon kaos custom, bordir kemeja komunitas, pembuatan jaket kelas, dan merchandise korporat.',
        4.6,
        1130
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10031,
                1015,
                'Jasa Sablon Kaos Custom Cotton Combed 30s (Min. 24 Pcs)',
                55000,
                'pcs',
                'Paket jasa konveksi pembuatan kaos sablon custom menggunakan bahan katun combed 30s premium standar distro yang adem, dengan jenis sablon plastisol tahan lama.',
                'https://dietalase.com/Assets/Product_Image/10031_productImage.webp',
                3,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10032,
                1015,
                'Kemeja PDL / Korsa Komunitas Custom Bahan Drill',
                95000,
                'pcs',
                'Pembuatan seragam kemeja lapangan/PDL untuk instansi, mahasiswa, atau komunitas dengan bahan American Drill tebal berpori, gratis bordir komputer 3 titik.',
                'https://dietalase.com/Assets/Product_Image/10032_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1016,
        'Klin Laundry Premium & Dry Cleaning',
        'Grocery',
        'Jl. Tebet Raya No. 45, Tebet Timur',
        'Jakarta Selatan',
        ST_SetSRID(ST_MakePoint(106.8572, -6.2285), 4326),
        'https://dietalase.com/Assets/Store_Image/1016_storeImage.webp',
        '081211223399',
        'Budi Haryono',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'tebet@klinlaundry.id',
        'Layanan cuci premium kiloan dan dry cleaning jas, kebaya, serta sepatu dengan teknologi ramah lingkungan dan pengerjaan cepat.',
        4.6,
        1220
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10033,
                1016,
                'Jasa Cuci Setrika Kiloan Premium',
                12000,
                'kg',
                'Layanan cuci dan setrika reguler menggunakan deterjen ramah lingkungan, wangi tahan lama, disetrika rapi, dan dikemas plastik higienis.',
                'https://dietalase.com/Assets/Product_Image/10033_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10034,
                1016,
                'Jasa Dry Cleaning Jas Pria (1 Set)',
                75000,
                'pcs',
                'Perawatan khusus dry cleaning untuk satu set jas pria (blazer dan celana panjang) menggunakan solvent premium untuk menjaga serat kain.',
                'https://dietalase.com/Assets/Product_Image/10034_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1017,
        'Berkat Jaya Steel (Welding & Iron Workshop)',
        'Manufacturing & Wholesale',
        'Jl. Kapuk Kamal No. 89, Penjaringan',
        'Jakarta Utara',
        ST_SetSRID(ST_MakePoint(106.742, -6.1215), 4326),
        'https://dietalase.com/Assets/Store_Image/1017_storeImage.webp',
        '0215566778',
        'Acong Wijaya',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'berkatjayasteel@gmail.com',
        'Bengkel las konstruksi besi menerima pengerjaan pagar rumah, kanopi, teralis, railing tangga, dan berbagai kebutuhan konstruksi baja ringan.',
        4.5,
        430
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10035,
                1017,
                'Kanopi Rumah Minimalis Rangka Besi Hollow',
                450000,
                'pcs',
                'Pembuatan dan pemasangan kanopi minimalis per meter persegi menggunakan rangka besi hollow antikarat dengan pilihan atap spandek atau polikarbonat.',
                'https://dietalase.com/Assets/Product_Image/10035_productImage.webp',
                1,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10036,
                1017,
                'Pagar Besi Tempa Klasik Custom',
                850000,
                'pcs',
                'Jasa pembuatan pagar besi tempa bermotif klasik mewah per meter persegi, dikerjakan secara custom sesuai ukuran perimeter rumah konsumen.',
                'https://dietalase.com/Assets/Product_Image/10036_productImage.webp',
                3,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1018,
        'CV Cetak Cepat Digital Printing',
        'Electronics',
        'Jl. Matraman Raya No. 122, Matraman',
        'Jakarta Timur',
        ST_SetSRID(ST_MakePoint(106.8554, -6.2012), 4326),
        'https://dietalase.com/Assets/Store_Image/1018_storeImage.webp',
        '0218590123',
        'Fahmi Salim',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'order@cetakcepat.co.id',
        'Pusat cetak digital kilat melayani print dokumen, banner, brosur, kartu nama, cetak buku, dan kebutuhan merchandise custom korporat.',
        4.7,
        2980
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10037,
                1018,
                'Cetak Banner Flexi 280g Custom',
                25000,
                'pcs',
                'Cetak banner outdoor per meter persegi menggunakan bahan Flexi China 280 gram berkualitas tinggi, hasil tajam, dan tahan cuaca panas maupun hujan.',
                'https://dietalase.com/Assets/Product_Image/10037_productImage.webp',
                6,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10038,
                1018,
                'Kartu Nama Matte Premium (1 Box)',
                45000,
                'box',
                'Cetak kartu nama bolak-balik berkualitas tinggi isi 100 lembar menggunakan kertas Art Carton 260g dengan finishing laminasi matte cetak offset.',
                'https://dietalase.com/Assets/Product_Image/10038_productImage.webp',
                9,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1019,
        'Genta Sport & Pemancingan',
        'Fashion',
        'Jl. Benyamin Sueb Blok A5, Kemayoran',
        'Jakarta Pusat',
        ST_SetSRID(ST_MakePoint(106.8425, -6.155), 4326),
        'https://dietalase.com/Assets/Store_Image/1019_storeImage.webp',
        '08551234567',
        'Heri Gunawan',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'gentasport@gmail.com',
        'Menyediakan perlengkapan olahraga terlengkap mulai dari badminton, sepak bola, hingga alat pancing premium orisinal bergaransi.',
        4.4,
        810
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10039,
                1019,
                'Raket Badminton Yonex Astrox 88D Play',
                820000,
                'pcs',
                'Raket bulutangkis Yonex original seri Astrox 88D Play, sangat cocok untuk pemain tipe menyerang belakang (heavy smash), produk batangan belum termasuk senar.',
                'https://dietalase.com/Assets/Product_Image/10039_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10040,
                1019,
                'Joran Pancing Shimano FX Spinning 210cm',
                245000,
                'pcs',
                'Joran pancing type spinning merk Shimano seri FX panjang 2.1 meter, kuat, lentur, cocok untuk memancing di kolam tawar maupun laut dangkal.',
                'https://dietalase.com/Assets/Product_Image/10040_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1020,
        'Maju Tani Agro Hub',
        'Grocery',
        'Jl. Raya Puspitek No. 12, Setu',
        'Tangerang Selatan',
        ST_SetSRID(ST_MakePoint(106.6714, -6.3482), 4326),
        'https://dietalase.com/Assets/Store_Image/1020_storeImage.webp',
        '081199001122',
        'Ir. Joko Susilo',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'majutaniagro@outlook.com',
        'Pusat penyedia bibit tanaman unggul, media tanam premium, pupuk organik, dan perlengkapan hidroponik skala hobi hingga industri pertanian perkotaan.',
        4.8,
        1340
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10041,
                1020,
                'Pupuk Organik Kompos Super NPK Berkah 5kg',
                25000,
                'pack',
                'Pupuk organik kompos siap pakai hasil fermentasi mikroba yang diperkaya unsur hara NPK alami untuk merangsang pertumbuhan daun dan pembuahan tanaman.',
                'https://dietalase.com/Assets/Product_Image/10041_productImage.webp',
                5,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10042,
                1020,
                'Bibit Pohon Mangga Harum Manis Okulasi',
                45000,
                'pcs',
                'Bibit tanaman hidup pohon mangga Harum Manis hasil perkembangbiakan okulasi unggul setinggi 50-60cm dalam polybag, cepat berbuah dan tahan penyakit.',
                'https://dietalase.com/Assets/Product_Image/10042_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1021,
        'Catering Ibu Djoko',
        'Food & Beverage',
        'Jl. Kebon Jeruk Raya No. 14, Kebon Jeruk',
        'Jakarta Barat',
        ST_SetSRID(ST_MakePoint(106.7725, -6.1923), 4326),
        'https://dietalase.com/Assets/Store_Image/1021_storeImage.webp',
        '081255554321',
        'Hajah Hartati Djoko',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'catering.ibudjoko@gmail.com',
        'Menerima pesanan nasi kotak, tumpeng besar, prasmanan pesta, dan katering harian kantoran dengan cita rasa masakan rumah tradisional yang higienis.',
        4.8,
        3100
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10043,
                1021,
                'Paket Nasi Kotak Ayam Bakar Taliwang',
                35000,
                'pack',
                'Nasi kotak premium lengkap dengan ayam bakar bumbu Taliwang pedas khas Lombok, plecing kangkung, sambal beberuk, dan tahu goreng.',
                'https://dietalase.com/Assets/Product_Image/10043_productImage.webp',
                9,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10044,
                1021,
                'Tumpeng Mini Kuning Berkah',
                45000,
                'pcs',
                'Nasi tumpeng kuning porsi personal berbentuk kerucut mini, dilengkapi dengan ayam suwir, perkedel, kering tempe, telur dadar iris, dan sambal goreng.',
                'https://dietalase.com/Assets/Product_Image/10044_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1022,
        'PT Natural Estetika Nusantara (Skincare Lab)',
        'Health & Beauty',
        'Jl. Pluit Selatan Raya No. 5, Penjaringan',
        'Jakarta Utara',
        ST_SetSRID(ST_MakePoint(106.7963, -6.1189), 4326),
        'https://dietalase.com/Assets/Store_Image/1022_storeImage.webp',
        '0216612345',
        'Dr. Elena Salim',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'production@naturalestetika.co.id',
        'Produsen dan maklon kosmetik berstandar CPKB dan BPOM, memformulasi produk perawatan kulit (skincare) berbahan dasar herbal organik lokal.',
        4.7,
        1540
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10045,
                1022,
                'Face Serum Glow Niacinamide 10% (Bulk 1L)',
                850000,
                'pcs',
                'Pasokan cairan serum wajah konsentrat Niacinamide 10% dalam kemasan dirigen harian 1 Liter, siap untuk pengemasan ulang (repacking) brand klinik kecantikan.',
                'https://dietalase.com/Assets/Product_Image/10045_productImage.webp',
                3,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10046,
                1022,
                'Sabun Mandi Cair Organik Serai 500ml',
                48000,
                'pcs',
                'Sabun mandi cair aromaterapi minyak serai murni, membersihkan kulit secara menyeluruh sekaligus melembapkan dan menangkal bakteri.',
                'https://dietalase.com/Assets/Product_Image/10046_productImage.webp',
                6,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1023,
        'Vertex Custom PC & Server Hub',
        'Electronics',
        'Mangga Dua Mall, Lantai 3 Blok B No. 45, Sawah Besar',
        'Jakarta Pusat',
        ST_SetSRID(ST_MakePoint(106.8242, -6.1345), 4326),
        'https://dietalase.com/Assets/Store_Image/1023_storeImage.webp',
        '081977889900',
        'Albert Christian',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'sales@vertexcomputer.id',
        'Spesialis perakitan PC Gaming high-end, workstation rendering profesional, serta penyediaan perangkat server dan jaringan untuk kebutuhan IT korporat.',
        4.9,
        2890
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10047,
                1023,
                'Kipas Fan Case PC 120mm ARGB PWM',
                125000,
                'pcs',
                'Kipas pendingin casing komputer ukuran 120mm dilengkapi lampu addressable RGB (ARGB) 5V 3-pin dan kendali kecepatan cerdas PWM.',
                'https://dietalase.com/Assets/Product_Image/10047_productImage.webp',
                8,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10048,
                1023,
                'Switch Network Hub 8-Port Gigabit Ethernet',
                320000,
                'pcs',
                'Alat pembagi jaringan internet (switch hub) desktop dengan 8 port RJ45 berkecepatan gigabit 10/100/1000Mbps, casing material besi kokoh.',
                'https://dietalase.com/Assets/Product_Image/10048_productImage.webp',
                9,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1024,
        'Sanggar Kerajinan Rotan Mandiri',
        'Furniture & Home Living',
        'Jl. Raya Bogor Km. 26, Ciracas',
        'Jakarta Timur',
        ST_SetSRID(ST_MakePoint(106.8684, -6.3251), 4326),
        'https://dietalase.com/Assets/Store_Image/1024_storeImage.webp',
        '085611224455',
        'Suryadi Pramono',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'rotanmandiri.craft@yahoo.com',
        'Pusat kerajinan anyaman rotan asli dekorasi rumah, memproduksi set meja kursi teras, pembatas ruangan, dan keranjang penyimpanan estetis.',
        4.6,
        780
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10049,
                1024,
                'Kursi Teras Rotan Alami Bohemian',
                450000,
                'pcs',
                'Kursi santai teras berlengan model lingkaran bohemian, dianyam handmade menggunakan rotan alami pilihan yang kuat dan dilapisi anti rayap.',
                'https://dietalase.com/Assets/Product_Image/10049_productImage.webp',
                5,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10050,
                1024,
                'Keranjang Baju Laundry Rotan Besar',
                160000,
                'pcs',
                'Keranjang pakaian kotor anyaman rotan berbentuk silinder tinggi besar dilengkapi penutup atas dan kain furing bagian dalam yang bisa dilepas cuci.',
                'https://dietalase.com/Assets/Product_Image/10050_productImage.webp',
                9,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1025,
        'UD Baja Semesta Logam',
        'Building Materials',
        'Jl. Cakung Cilincing Raya No. 34, Cakung',
        'Jakarta Timur',
        ST_SetSRID(ST_MakePoint(106.9452, -6.1685), 4326),
        'https://dietalase.com/Assets/Store_Image/1025_storeImage.webp',
        '0214409876',
        'Iwan Setiadi',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'bajasemestalogam@gmail.com',
        'Pemasok skala besar besi beton, baja ringan, atap spandek, pipa besi hitam, kawat bronjong, dan pelat besi struktural untuk fabrikasi proyek konstruksi.',
        4.5,
        1920
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10051,
                1025,
                'Besi Beton Ulir D12 SNI (Panjang 12 Meter)',
                115000,
                'pcs',
                'Besi beton ulir (deformed bar) diameter nominal 12mm standar SNI panjang 12 meter, material utama struktural kolom balok beton bertulang bangunan.',
                'https://dietalase.com/Assets/Product_Image/10051_productImage.webp',
                6,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10052,
                1025,
                'Atap Spandek Galvalum G300 Tebal 0.3mm',
                52000,
                'meter',
                'Atap gelombang spandek zinc-aluminum galvalum tebal 0.30mm, anti karat, ringan, kuat, ideal untuk atap kanopi rumah maupun gudang pabrik besar.',
                'https://dietalase.com/Assets/Product_Image/10052_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1026,
        'Medina Hijab & Muslim Wear',
        'Fashion',
        'Pusat Grosir Tanah Abang Blok A Lt. 1 No. 58',
        'Jakarta Pusat',
        ST_SetSRID(ST_MakePoint(106.8124, -6.1878), 4326),
        'https://dietalase.com/Assets/Store_Image/1026_storeImage.webp',
        '081388990011',
        'Siti Hasanah',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'medina.tanahabang@gmail.com',
        'Grosir dan eceran jilbab segi empat, pashmina premium, dan gamis syar''i modis berkualitas tinggi langsung dari konveksi tangan pertama.',
        4.7,
        4150
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10053,
                1026,
                'Hijab Segi Empat Voal Premium',
                45000,
                'pcs',
                'Kerudung segi empat berbahan ultra-fine voal ukuran 115x115cm, tegak di dahi, tidak pekak di telinga, dan tersedia dalam berbagai variasi warna pastel.',
                'https://dietalase.com/Assets/Product_Image/10053_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10054,
                1026,
                'Pashmina Silk Plisket Cradenza',
                65000,
                'pcs',
                'Hijab pashmina panjang berbahan sutra cradenza bertekstur plisket lidi halus berkerut mewah dengan efek kilau elegan, sangat jatuh dan mudah dibentuk.',
                'https://dietalase.com/Assets/Product_Image/10054_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1027,
        'Apex Auto Detailing & Ceramic Coating',
        'Automotive',
        'Jl. Radio Dalam Raya No. 102, Kebayoran Baru',
        'Jakarta Selatan',
        ST_SetSRID(ST_MakePoint(106.7904, -6.2489), 4326),
        'https://dietalase.com/Assets/Store_Image/1027_storeImage.webp',
        '0217254321',
        'Raymond Hartanto',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'contact@apexdetailing.id',
        'Layanan perawatan kosmetik kendaraan premium, salon mobil interior-exterior, poles multi-stage paint correction, dan proteksi lapisan nano ceramic coating 9H.',
        4.9,
        870
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10055,
                1027,
                'Paket Paint Correction + Nano Ceramic Coating 9H (Mobil Sedang)',
                3500000,
                'pcs',
                'Paket pengerjaan poles 3 tahap untuk menghilangkan baret halus dan swirl mark, dilapisi 3 layer nano ceramic coating 9H bergaransi 3 tahun untuk kilau efek daun talas permanen.',
                'https://dietalase.com/Assets/Product_Image/10055_productImage.webp',
                4,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10056,
                1027,
                'Cairan Car Wash Shampoo Wax Premium 1L',
                85000,
                'pcs',
                'Sampo pencuci mobil formula pH balance premium dengan kandungan carnauba wax murni, aman untuk lapisan coating dan memberikan kilau instan setelah dicuci.',
                'https://dietalase.com/Assets/Product_Image/10056_productImage.webp',
                1,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1028,
        'Toko Surya Makmur Listrik',
        'Electronics',
        'Jl. Kenari Raya Blok B No. 12, Senen',
        'Jakarta Pusat',
        ST_SetSRID(ST_MakePoint(106.8458, -6.1915), 4326),
        'https://dietalase.com/Assets/Store_Image/1028_storeImage.webp',
        '0213192456',
        'Hendra Susanto',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'suryamakmurlistrik@gmail.com',
        'Supplier grosir dan eceran alat-alat instalasi listrik bangunan, panel listrik industri, kabel tembaga SNI, lampu LED hemat energi, dan komponen kelistrikan terlengkap.',
        4.5,
        2130
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10057,
                1028,
                'Kabel Listrik NYM Supreme 3x2.5mm (Roll 50 Meter)',
                820000,
                'roll',
                'Kabel tembaga instalasi listrik rumah tangga tipe NYM isi 3 core diameter tembaga 2.5mm standar SNI merek Supreme original, lapisan isolasi PVC putih tebal aman tertanam di dinding.',
                'https://dietalase.com/Assets/Product_Image/10057_productImage.webp',
                1,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10058,
                1028,
                'Miniature Circuit Breaker (MCB) Schneider 16A DomAE',
                65000,
                'pcs',
                'Alat pengaman pembatas arus listrik sirkuit tunggal (1 Phase) daya 16 Ampere tipe DomAE Schneider Electric original, efektif mencegah bahaya kebakaran akibat korsleting.',
                'https://dietalase.com/Assets/Product_Image/10058_productImage.webp',
                2,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1029,
        'Ayam Goreng Kampung H. Mardun',
        'Food & Beverage',
        'Jl. Jatinegara Timur No. 84, Balester, Jatinegara',
        'Jakarta Timur',
        ST_SetSRID(ST_MakePoint(106.8682, -6.223), 4326),
        'https://dietalase.com/Assets/Store_Image/1029_storeImage.webp',
        '081299998811',
        'Haji Mardun',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'ayamgoreng.mardun@yahoo.com',
        'Kuliner legendaris masakan Betawi asli menyajikan ayam goreng kampung bumbu kuning tradisional ungkep kelapa, disajikan hangat dengan sambal terasi ulek gurih.',
        4.8,
        5420
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10059,
                1029,
                'Paket Ayam Goreng Kampung Utuh (1 Ekor)',
                95000,
                'pcs',
                'Satu ekor ayam kampung utuh (termasuk ati ampela dan ceker) yang sudah diungkep bumbu kuning rempah rahasia lalu digoreng garing merata, renyah di luar dan empuk juicy di dalam, lengkap dengan kremesan lengkuas.',
                'https://dietalase.com/Assets/Product_Image/10059_productImage.webp',
                10,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10060,
                1029,
                'Sambal Terasi Ulek Matang (Toples 200g)',
                30000,
                'pcs',
                'Sambal terasi goreng ulek khas Betawi buatan rumah kemasan botol kaca jar premium higienis, dibuat dari cabai rawit segar pilihan, tomat merah, dan terasi udang premium aroma tajam.',
                'https://dietalase.com/Assets/Product_Image/10060_productImage.webp',
                9,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

INSERT INTO public.stores (
        sid, name, type, address, city, location, image, contact, owner_name, owner_image, status, email, description, average_rating, total_reviews
    ) VALUES (
        1030,
        'CV Indo Kreasi Pack (Corrugated Box Factory)',
        'Manufacturing & Wholesale',
        'Kawasan Industri Marunda Blok C3 No. 8, Cilincing',
        'Jakarta Utara',
        ST_SetSRID(ST_MakePoint(106.9421, -6.1084), 4326),
        'https://dietalase.com/Assets/Store_Image/1030_storeImage.webp',
        '0214483210',
        'Gunawan Pranoto',
        'https://dietalase.com/Assets/Owner_Image/dummy_owner.webp',
        'Active',
        'marketing@indokreasipack.co.id',
        'Pabrik produsen kemasan kardus kustom berskala menengah, memproduksi karton boks gelombang (corrugated box) ukuran kustom untuk logistik pengiriman, e-commerce harian, dan kemasan arsip arsip korporat.',
        4.6,
        1640
    ) ON CONFLICT (sid) DO NOTHING;

INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10061,
                1030,
                'Kardus Polos E-Commerce Tipe Die Cut (Paket Grosir 100 Pcs)',
                180000,
                'pack',
                'Paket bundel 100 lembar boks kardus packing e-commerce model die-cut lipat otomatis ukuran 20x10x5cm, bahan single wall corrugated kaku ketebalan E-flute premium keras, pelindung paket aman dikirim kurir ekspedisi.',
                'https://dietalase.com/Assets/Product_Image/10061_productImage.webp',
                10,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;
INSERT INTO public.products (
                pid, sid, name, price, unit, description, image, stock, category, dimensions, status
            ) VALUES (
                10062,
                1030,
                'Kardus Karton Box Arsip File Dokumen Besar',
                22000,
                'pcs',
                'Kardus arsip file dokumen tebal model pisah (body + tutup terpisah) ukuran standar kantor 40x32x28cm dilengkapi lubang pegangan kanan kiri, muat hingga 5 buah ordner file besar ring binder.',
                'https://dietalase.com/Assets/Product_Image/10062_productImage.webp',
                7,
                'General',
                '1 cm',
                'Available'
            ) ON CONFLICT (pid) DO NOTHING;

COMMIT;


-- Operating Hours
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1001, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1001, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1001, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1001, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1001, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1001, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1001, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1002, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1002, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1002, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1002, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1002, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1002, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1002, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1003, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1003, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1003, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1003, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1003, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1003, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1003, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1004, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1004, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1004, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1004, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1004, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1004, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1004, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1005, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1005, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1005, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1005, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1005, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1005, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1005, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1006, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1006, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1006, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1006, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1006, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1006, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1006, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1007, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1007, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1007, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1007, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1007, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1007, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1007, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1008, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1008, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1008, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1008, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1008, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1008, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1008, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1009, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1009, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1009, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1009, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1009, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1009, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1009, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1010, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1010, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1010, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1010, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1010, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1010, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1010, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1011, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1011, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1011, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1011, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1011, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1011, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1011, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1012, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1012, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1012, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1012, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1012, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1012, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1012, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1013, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1013, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1013, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1013, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1013, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1013, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1013, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1014, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1014, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1014, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1014, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1014, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1014, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1014, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1015, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1015, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1015, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1015, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1015, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1015, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1015, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1016, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1016, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1016, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1016, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1016, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1016, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1016, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1017, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1017, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1017, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1017, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1017, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1017, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1017, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1018, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1018, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1018, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1018, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1018, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1018, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1018, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1019, 1, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1019, 2, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1019, 3, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1019, 4, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1019, 5, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1019, 6, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
INSERT INTO public.store_operating_hours (sid, day_of_week, open_time, close_time) VALUES (1019, 7, '08:00:00', '20:00:00') ON CONFLICT (sid, day_of_week) DO NOTHING;
