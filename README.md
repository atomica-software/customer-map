# Stripe Customer Map

A Remix application that visualizes your Stripe customers on an interactive 3D globe.

## Features
- **Stripe Integration**: Connects to your Stripe account via Read-Only API key.
- **Data Aggregation**: Fetches customer data and aggregates it by country.
- **Interactive Map**: Uses amCharts 5 to plot customers as bubbles on a rotating globe.
- **Mock Mode**: Includes a test mode to demonstrate functionality without a real API key.

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation
1. Clone the repository (if applicable) or navigate to the project directory.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
Start the development server:
```bash
npm run dev
```
Open your browser to [http://localhost:5173](http://localhost:5173).

## Usage

### Mock Mode (Demo)
1. In the "Stripe Secret Key" input field, type: `test`
2. Click **Visualize**.
3. The app will simulate a network request and plot dummy data on the map.

### Real Data
1. Get a **Restricted API Key** from your Stripe Dashboard:
   - Go to Developers > API Keys.
   - Create a restricted key with **Read** access to **Customers**.
2. Paste the key (starting with `rk_...` or `sk_...`) into the input field.
   - *Note: We recommend using a restricted key for security, although standard secret keys work.*
3. Click **Visualize**.
4. The app will fetch your customers (limit 1000 for this demo) and plot them.

## Troubleshooting
- **Map not loading?** Ensure you have an active internet connection as amCharts may load some assets dynamically or check the console for errors.
- **Stripe Error?** Double-check your API key permissions. It needs `customers.read`.
