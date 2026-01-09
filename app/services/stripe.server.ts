import Stripe from 'stripe';

export interface CustomerDetail {
  id: string;
  name: string | null;
  email: string | null;
  spend?: number; // In cents
  currency?: string;
  city?: string;
}

export interface CountryData {
  id: string; // ISO 2-letter country code
  value: number; // Count of customers
  customers: CustomerDetail[]; // List of customers
}

export async function getCustomersByCountry(apiKey: string): Promise<CountryData[]> {
  // Mock Mode
  if (apiKey === 'test') {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockCountries: { id: string; count: number }[] = [
          { id: 'US', count: 15 },
          { id: 'GB', count: 8 },
          { id: 'CA', count: 5 },
          { id: 'DE', count: 3 },
          { id: 'AU', count: 2 },
        ];

        const data: CountryData[] = mockCountries.map(c => ({
          id: c.id,
          value: c.count,
          customers: Array.from({ length: c.count }).map((_, i) => ({
            id: `cus_${c.id}_${i}`,
            name: `Mock Customer ${i + 1} from ${c.id}`,
            email: `customer${i}@example.com`,
            spend: Math.floor(Math.random() * 100000), // 0 to $1000.00
            currency: 'usd',
            city: 'Mock Customer City'
          }))
        }));

        resolve(data);
      }, 1000);
    });
  }

  // Real Stripe Integration
  try {
    const stripe = new Stripe(apiKey, {
      apiVersion: '2025-01-27.acacia',
    });

    const countries: Record<string, CustomerDetail[]> = {};
    let hasMore = true;
    let lastId: string | undefined = undefined;

    // Fetch customers
    let count = 0;
    while (hasMore && count < 1000) {
      const params: Stripe.CustomerListParams = { limit: 100 };
      if (lastId) params.starting_after = lastId;

      const customers = await stripe.customers.list(params);

      for (const customer of customers.data) {
        // Check standard address field
        const country = customer.address?.country || customer.shipping?.address?.country;
        if (country) {
          const upperCountry = country.toUpperCase();
          if (!countries[upperCountry]) {
            countries[upperCountry] = [];
          }

          countries[upperCountry].push({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            city: customer.address?.city || customer.shipping?.address?.city || undefined,
          });
        }
      }

      hasMore = customers.has_more;
      if (hasMore && customers.data.length > 0) {
        lastId = customers.data[customers.data.length - 1].id;
      } else {
        hasMore = false;
      }
      count += customers.data.length;
    }

    return Object.entries(countries).map(([id, resultCustomers]) => ({
      id,
      value: resultCustomers.length,
      customers: resultCustomers
    }));
  } catch (error) {
    console.error('Stripe API Error:', error);
    throw new Error('Failed to fetch data from Stripe. Please check your API key.');
  }
}
