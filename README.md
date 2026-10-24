# PureFlow: water purifier e-commerce app

**Live admin panel (demo mode):** https://pureflow-admin.vercel.app. Log in with `admin@pureflow.test` / `Admin@123`. Without Firebase keys it runs on built-in sample data saved in your browser.

PureFlow is an Android shopping app (React Native + Expo) with an admin panel hosted on Vercel. Data and logins use Firebase on the free Spark plan. Every service below has a free tier, so the whole setup costs nothing.

| Part | Stack | Folder |
|---|---|---|
| Mobile app (Customer + Dealer) | Expo SDK 58, expo-router, Firebase JS SDK | [mobile/](mobile/) |
| Admin panel | Vite + React, deployed on Vercel | [admin/](admin/) |
| Notifications API | Vercel serverless function (FCM, TextBee SMS, EmailJS) | [admin/api/notify.js](admin/api/notify.js) |
| Catalog, seed and image scripts | Node | [admin/scripts/](admin/scripts/) |
| Security rules | Firestore rules (31 automated checks) | [firestore.rules](firestore.rules) |

## Features

**Customer app:** a catalog of 52 products in 5 categories (Purifiers 14, Dispensers 8, Pumps 8, Filters 12, Spares 10) with search, category filters and sorting. Also: product detail with specs, a cart that is saved on the device, and checkout with Razorpay (test mode) or cash on delivery. Addresses can be filled from GPS or picked on an OpenStreetMap map. Order history has a live status timeline, cancel and reorder. Customers can book service visits (installation, repair, AMC, filter change and more) with a date and time slot, and edit their profile. Notifications arrive as FCM push messages and also appear in an in-app inbox.

**Dealer app:** the login screen has a separate Dealer tab, and the account must have role `dealer`. New dealers apply with business details and GSTIN and wait on a review screen until approved; the app updates live when an admin approves them. Approved dealers see wholesale prices on the same catalog, with a minimum order quantity (MOQ) per product. Bulk orders get an extra 3% off above ₹50k and 5% above ₹1L. Dealers also get a spreadsheet-style bulk order sheet, a 15-day credit payment option and their order history.

**Admin panel:** a dashboard with revenue, a 7-day chart, orders by status and a "needs attention" list. Admins can:
- move orders through placed → confirmed → shipped → delivered, add tracking or cancel
- approve, reject or revoke dealers
- run the service desk: assign technicians, update status, see an OpenStreetMap preview of the visit address
- add or edit products and change stock inline

Every admin action notifies the customer by push, SMS, email and the in-app inbox.

**Security:** the Firestore rules stop users from making themselves admin, approving themselves as dealers, seeing other people's orders, or ordering at dealer prices unless they are an approved dealer. [admin/scripts/test-rules.mjs](admin/scripts/test-rules.mjs) checks all of this against the Firebase emulator.

## Demo accounts (created by the seed script)

| Role | Email | Password | Where |
|---|---|---|---|
| Admin | admin@pureflow.test | Admin@123 | Admin panel |
| Customer | customer@pureflow.test | Customer@123 | App → Customer |
| Dealer (approved) | dealer@pureflow.test | Dealer@123 | App → Dealer |
| Dealer (pending) | newdealer@pureflow.test | Dealer@123 | App → Dealer (review screen) |

Razorpay test card: `4111 1111 1111 1111`, any future expiry date, any CVV, OTP `1234` (any OTP works in test mode). For UPI, use `success@razorpay`.

---

## Setup (about 30 minutes, all free)

### 1. Firebase (Spark plan)
1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project. Google Analytics is optional.
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database.** Choose production mode and a region near your users (for example `asia-south1`).
4. Publish the rules. Either paste [firestore.rules](firestore.rules) into the Firestore **Rules** tab, or run `npx firebase-tools deploy --only firestore:rules --project <id>`.
5. **Project settings → Your apps → Web app (</>)** and copy the config values. You need them for both `.env` files below.
6. **Project settings → Your apps → Add app → Android**, package `com.pureflow.store`. Download `google-services.json` into `mobile/`. FCM push needs this file.
7. **Project settings → Service accounts → Generate new private key.** Save it as `admin/serviceAccount.json`. Git ignores this file, so it won't be committed. Never commit it.

### 2. Product images
The image URLs are stored in Firestore. By default the images are served by the admin site on Vercel from `admin/public/products/<id>.jpg`. Generate them once with FLUX using any one free provider:

```bash
cd admin
npm install
# Option A – Cloudflare Workers AI (free daily quota)
CF_ACCOUNT_ID=... CF_API_TOKEN=... npm run images
# Option B – Hugging Face (free token)
HF_TOKEN=hf_... npm run images
# Option C – Pollinations (free account)
POLLINATIONS_TOKEN=... npm run images
```
On Windows PowerShell, set each variable first (`$env:HF_TOKEN="hf_..."`), then run `npm run images`.

Each prompt describes that specific product (see the `look` field in [catalog.mjs](admin/scripts/catalog.mjs)), so the images match the product names. Check the results in `admin/public/products/`. To regenerate any image you don't like, run `npm run images -- --only=<id> --force`.

*Cloudinary instead of Vercel:* create an **unsigned upload preset**, then run `CLOUDINARY_CLOUD_NAME=... CLOUDINARY_UPLOAD_PRESET=... npm run images -- --cloudinary`. This writes `scripts/image-urls.json`, which the seed script uses automatically.

### 3. Deploy the admin panel to Vercel
1. Push this repo to GitHub. On [vercel.com](https://vercel.com), click **Add New → Project**, import the repo and set **Root Directory** to `admin`. Vercel detects Vite automatically.
2. Add these **Environment Variables**:
   - `VITE_FIREBASE_*`: the six web config values (see [admin/.env.example](admin/.env.example)).
   - `FIREBASE_SERVICE_ACCOUNT`: the full contents of `serviceAccount.json`, either pasted as is or base64-encoded. The notify function uses it.
   - Optional `TEXTBEE_API_KEY` and `TEXTBEE_DEVICE_ID` for SMS ([textbee.dev](https://textbee.dev): install the app on any Android phone).
   - Optional `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` and `EMAILJS_PRIVATE_KEY` for email. In EmailJS, go to Account → Security and enable *Allow EmailJS API for non-browser applications*. The template can use `{{to_email}}`, `{{to_name}}`, `{{title}}` and `{{message}}`.
3. Deploy. Your URL will look like `https://pureflow-admin.vercel.app`.
4. **Firebase → Authentication → Settings → Authorized domains** and add your Vercel domain.

CLI alternative: `cd admin && npx vercel --prod`.

### 4. Seed Firestore
```bash
cd admin
IMAGE_BASE_URL=https://<your-admin>.vercel.app npm run seed     # PowerShell: $env:IMAGE_BASE_URL="https://..."; npm run seed
```
This loads the 52 products, the 4 demo accounts above, 7 sample orders and 3 service tickets. You can run it again safely. Use `-- --products-only` to refresh only the catalog.

### 5. Run the mobile app
```bash
cd mobile
cp .env.example .env      # fill in Firebase web config, rzp_test_ key, EXPO_PUBLIC_API_BASE=https://<your-admin>.vercel.app
npm install
npx expo start            # scan the QR code with Expo Go on Android
```
Everything works in Expo Go except *remote* FCM push, which Expo Go doesn't support. In Expo Go the app falls back to local notifications driven by the Firestore inbox, so status updates still pop up while the app is running.

### 6. Build the Android APK (with real FCM push)
```bash
npm install -g eas-cli
cd mobile
eas login                 # free Expo account
eas init                  # links the project
eas env:create --environment preview --name EXPO_PUBLIC_FIREBASE_API_KEY --value ...   # repeat for every key in .env, or add them on expo.dev
eas build -p android --profile preview
```
EAS prints a link to download the `.apk`. Install it on a phone and allow notifications. The FCM token is saved on the user's profile, and admin actions then send real push notifications.

---

## Local development without a Firebase project
```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-pureflow
# new terminal
cd admin
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 IMAGE_BASE_URL=http://localhost:5173 npm run seed
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/test-rules.mjs       # 31 security-rule checks
VITE_USE_EMULATORS=true VITE_FIREBASE_API_KEY=demo VITE_FIREBASE_PROJECT_ID=demo-pureflow npm run dev
# mobile: add EXPO_PUBLIC_EMULATOR_HOST=<your PC's LAN IP> to mobile/.env
```

## Data model
- `users/{uid}`: `role` (customer, dealer or admin), `dealerStatus` (pending, approved or rejected), name, phone, email, address, `fcmToken`
- `products/{id}`: name, category, price, mrp, dealerPrice, moq, stock, rating, specs, image, active
- `orders/{id}`: orderNo, userId, `channel` (retail or dealer), items[], subtotal/discount/shipping/total/gst, address, payment, status, statusHistory[], tracking
- `serviceRequests/{id}`: ticketNo, userId, type, product, issue, preferredDate, slot, address, status, technician, adminNote, history[]
- `notifications/{id}`: userId, title, body, data, read

## Notes and limits
- Prices are calculated in the app. The rules make sure only approved dealers can place `dealer` orders, but they can't re-check item prices. Re-checking prices needs a trusted backend, such as moving order creation into a Vercel function.
- Razorpay runs in test mode without an Orders API call. Payment IDs are recorded but never verified on a server. For real payments, create orders and verify signatures in a Vercel function using the key secret.
- Nominatim (OpenStreetMap reverse geocoding) allows about 1 request per second, which is fine for a demo. For heavier use, switch to Geoapify's free tier.
