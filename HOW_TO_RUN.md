# 🛠️ DiEtalase Local Development Guide

This guide explains how to run the DiEtalase backend, website, and mobile apps locally while connecting to the online database.

## 📁 Project Structure

- `DiEtalase-Nodejs`: Express Backend & Web Portal (Local)
- `DiEtalase-Store`: Flutter App for Merchants (Real Device/Emulator)
- `DiEtalase-User`: Flutter App for Customers (Real Device/Emulator)

---

## 🚀 1. Starting the Backend Server

The backend is configured to use the **online database** via `.env`.

1. Open a terminal in the backend directory:
   ```bash
   npm start
   ```

---

## 🌐 2. Running the Website

The website is served directly by the backend from the `public/` directory.
Once the backend is running, you can access it at:
👉 **`http://localhost:3000`**

---

## 📱 3. Running Mobile Apps on Real Device

To test the mobile apps on a real device and connect to your local backend:

### Step A: Reverse Port Forwarding

Connect your device via USB (ensure USB Debugging is enabled) and run:

```bash
# For Emulator
adb -s emulator-5554 reverse tcp:3000 tcp:3000

# For Physical Device (replace <DEVICE_ID> with `adb devices` output)
adb -s <DEVICE_ID> reverse tcp:3000 tcp:3000
```

_This allows the mobile device to access `localhost:3000` as if it were the computer._

### Step B: Run the Apps

**Customer App (User):**

```bash
cd "/home/petrachristalbert/Development/Flutter/DiEtalase-User"
flutter run
```

---

## ⚙️ 4. Local Configuration (Temporary Changes)

The following changes have been applied to point the apps to your local server:

### Backend (`DiEtalase-Nodejs/.env`)

- `APP_URL` set to `http://localhost:3000`
- `ALLOWED_ORIGINS` includes `http://localhost:3000`

### Flutter Apps (`lib/Data.dart`)

In both `DiEtalase-Store` and `DiEtalase-User`, the `ServerIP` has been updated:

```dart
static String ServerIP = "http://localhost:3000";
```

> [!NOTE]
> If you are using an **Android Emulator** instead of a real device, you may need to use `http://10.0.2.2:3000` if `localhost` doesn't resolve correctly.

---

## 🛠️ Troubleshooting

### Port 3000 already in use

If the server fails to start, kill the existing process:

```bash
fuser -k 3000/tcp
```

### Database Connection Error

Ensure your internet connection is stable, as the backend is connecting to the online host `db.dietalase.com`.

1. For backend/server file changes (app.js, routes, etc.)
   Instead of running npm start (which just runs node ./bin/www), you can run it with a "watch" flag so it auto-restarts on any file save:

```bash
cd "/home/petrachristalbert/Development/Nodejs/DiEtalase-Nodejs"
npx nodemon ./bin/www
```
