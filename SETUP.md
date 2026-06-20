# Cashback Tracker — Setup & Build Guide

## Prerequisites

Install these once on your computer:
- **Node.js** (v20.19+, required for SDK 54): https://nodejs.org
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI** (for APK build): `npm install -g eas-cli`
- **Expo Go app** on your Android phone (for testing): Search "Expo Go" on Play Store

---

## Step 1 — Install Dependencies

Open Terminal, navigate to this folder, and run:

```bash
cd cashback-tracker
npm install
```

---

## Step 2 — Run on Your Phone (for testing)

```bash
npx expo start
```

This shows a QR code. Scan it with **Expo Go** on your Android phone. The app loads instantly — no APK needed for testing.

---

## Step 3 — Build the APK

### 3a. Login to Expo account (free)
```bash
eas login
```
Create a free account at https://expo.dev if you don't have one.

### 3b. Configure EAS Build (first time only)
```bash
eas build:configure
```
When asked, choose **Android**.

### 3c. Build the APK
```bash
eas build --platform android --profile preview
```

This uploads your code to Expo's build servers and builds the APK. Takes ~5–10 minutes.

### 3d. Download the APK
When the build finishes, EAS gives you a download link. Download the `.apk` file and install it directly on your Android phone.

> **Enable "Install from unknown sources"** on your phone if prompted.

---

## App Features

### Cards Tab
- Add each credit card with just the **last 4 digits** (no full card number needed)
- Configure reward type:
  - **Cashback**: Enter the cashback % (e.g., 1.5 for 1.5%)
  - **Points**: Enter points per ₹1 spent + how many points = ₹1 value
- Tap a card to edit, long-press to delete

### Transactions Tab
- Log every transaction: amount, merchant, category, date, notes
- Toggle **"Got Cashback?"** — reward is auto-calculated from your card config
- Filter by card using the chips at the top
- Tap to edit, long-press to delete

### Summary Tab
- Browse month-by-month with < > arrows
- See total spent, cashback/points earned per card
- Shows effective cashback rate per card

### Data Tab (Export / Import)
| Action | Use Case |
|--------|----------|
| Export JSON | Full backup — restore on same or new device |
| Export CSV | View all transactions in Excel / Google Sheets |
| Import JSON | Restore from a backup |
| Clear All Data | Reset everything |

**Migrating to a new phone:** Export JSON → send the file to new phone → Import JSON.

---

## Reward Calculation

- **Cashback cards**: `Cashback = Amount × (Rate / 100)`
  - e.g., ₹2000 × 1.5% = ₹30 cashback

- **Points cards**: 
  - `Points = Amount × PointsPerRupee`
  - `Value = Points ÷ PointsFor1Rupee`
  - e.g., ₹2000 × 2 pts/₹ = 4000 pts; 4000 ÷ 4 = ₹1000 value

---

## Troubleshooting

**"Metro bundler not starting"** → Run `npx expo start --clear`

**Build fails on EAS** → Make sure you ran `eas build:configure` first

**Import not working** → The JSON file must be exported from this app (via Export Backup)
