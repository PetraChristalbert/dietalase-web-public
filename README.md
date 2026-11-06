# DiEtalase Web & Backend API

DiEtalase is an omnichannel hyperlocal e-commerce and store catalog platform built with Node.js, Express, and PostgreSQL (with PostGIS for geospatial store & product discovery).

## Features

- **Hyperlocal Discovery**: Real-time GPS-based store and product search utilizing PostGIS (`ST_DWithin`, `ST_Distance`).
- **Store & Product Management**: Merchant catalog, stock management, operating hours, news feeds, and promotional updates.
- **AI Integrations**: Semantic search powered by vector embeddings and Google Gemini / OpenAI.
- **Payment Processing**: Integrated with Midtrans Snap & Core API for automated payments.
- **Push Notifications**: Firebase Cloud Messaging (FCM) alerts for merchants and buyers.
- **Admin & Field Ops Portal**: Complete administration portal with 2FA, IP protection, and merchant verification.
- **WhatsApp Bot Integration**: Real-time communication and automated notifications via Baileys.

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- PostgreSQL (v14+ with PostGIS extension enabled)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/PetraChristalbert/dietalase-web-public.git
   cd dietalase-web-public
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and configure your database credentials, API keys, and secrets.

4. **Firebase Configuration (Optional for notifications/auth):**
   Copy the sample Firebase Service Account file:
   ```bash
   cp service-account.example.json service-account.json
   ```
   Replace the placeholder values with your Firebase Service Account JSON credentials if using Firebase features.

5. **Initialize Database Schema:**
   Ensure PostgreSQL is running with the PostGIS extension enabled (`CREATE EXTENSION IF NOT EXISTS postgis;`), then run:
   ```bash
   psql -U your_db_user -d dietalase_db -f init.sql
   ```
   *(Optional)* Populate dummy stores and test data:
   ```bash
   psql -U your_db_user -d dietalase_db -f insert_dummy_data.sql
   ```

6. **Start the Application:**
   ```bash
   # Development mode with hot-reloading
   npm run dev

   # Production mode
   npm start
   ```

7. **Access the Portal:**
   - Web Storefront: [http://localhost:3000](http://localhost:3000)
   - Admin Login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

---

## Security & Contributions

- Never commit `.env` or production service accounts to version control.
- All secrets and credentials in this repository are placeholders.
- For bug reports or feature requests, please submit an issue or pull request.

## License

This project is licensed under the MIT License.
