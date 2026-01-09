import { Form, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { useEffect, useState, Suspense, lazy, useMemo } from 'react';
import { getCustomersByCountry, type CountryData, type CustomerDetail } from '~/services/stripe.server';

// Lazy load Map to ensure client-side only rendering
const Map = lazy(() => import('~/components/Map'));

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const apiKey = formData.get('apiKey');

    if (!apiKey || typeof apiKey !== 'string') {
        return { error: 'Please provide a valid API Key', data: null };
    }

    try {
        const data = await getCustomersByCountry(apiKey);
        return { error: null, data: data };
    } catch (e: any) {
        return { error: e.message || 'Unknown error occurred', data: null };
    }
}

export default function Index() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';

    // Use a state to track if we are on the client to safely render the lazy Map
    const [isClient, setIsClient] = useState(false);
    const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Reset selection when new data is fetched
    useEffect(() => {
        if (isSubmitting) {
            setSelectedCountryId(null);
        }
    }, [isSubmitting]);

    const selectedCountryData = useMemo(() => {
        if (!actionData?.data || !selectedCountryId) return null;
        return actionData.data.find((c: CountryData) => c.id === selectedCountryId);
    }, [actionData, selectedCountryId]);

    const sortedCustomers = useMemo(() => {
        if (!selectedCountryData) return [];
        return [...selectedCountryData.customers].sort((a, b) => {
            // Sort by spend descending if available
            if ((a.spend || 0) !== (b.spend || 0)) {
                return (b.spend || 0) - (a.spend || 0);
            }
            // Fallback to name
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [selectedCountryData]);

    const formatCurrency = (amount?: number, currency?: string) => {
        if (amount === undefined) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD'
        }).format(amount / 100);
    };

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '40px', textAlign: 'center' }}>
                <h1>🌍 Stripe Customer Map</h1>
                <p>Visualize your Stripe customers across the globe.</p>
            </header>

            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h2 style={{ marginTop: 0 }}>Configuration</h2>
                <Form method="post" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flexGrow: 1 }}>
                        <label htmlFor="apiKey" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Stripe Secret Key (Read-Only)</label>
                        <input
                            type="password"
                            name="apiKey"
                            id="apiKey"
                            placeholder="sk_test_... or type 'test' for mock data"
                            required
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: isSubmitting ? '#ccc' : '#6772e5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            height: '42px' // Match input height roughly
                        }}
                    >
                        {isSubmitting ? 'Loading...' : 'Visualize'}
                    </button>
                </Form>
                <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                    <strong>Tip:</strong> Use <code>test</code> as the key to see a demo with mock data.
                </p>
            </div>

            {actionData?.error && (
                <div style={{ padding: '15px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '20px' }}>
                    <strong>Error:</strong> {actionData.error}
                </div>
            )}

            {isSubmitting && (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <p> Fetching and aggregating customer data... This may take a moment.</p>
                    <div className="spinner" style={{
                        border: '4px solid #f3f3f3',
                        borderTop: '4px solid #6772e5',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                    }} />
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {actionData?.data && !isSubmitting && (
                <>
                    <div style={{ height: '500px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', background: '#fff', marginBottom: '20px' }}>
                        {isClient && (
                            <Suspense fallback={<div style={{ padding: 20 }}>Loading Map Engine...</div>}>
                                <Map
                                    data={actionData.data}
                                    onCountryClick={(id) => setSelectedCountryId(id)}
                                />
                            </Suspense>
                        )}
                    </div>

                    {selectedCountryData && (
                        <div id="customer-list" style={{ animation: 'fadeIn 0.5s' }}>
                            <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                                Customers in {selectedCountryId}
                                <span style={{ fontSize: '0.6em', color: '#666', marginLeft: '10px', fontWeight: 'normal' }}>
                                    ({selectedCountryData.customers.length})
                                </span>
                            </h2>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                    <thead>
                                        <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                                            <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Name</th>
                                            <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>City</th>
                                            <th style={{ padding: '12px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>Total Spend</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedCustomers.map((customer) => (
                                            <tr key={customer.id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '12px' }}>{customer.name || <em>Unknown</em>}</td>
                                                <td style={{ padding: '12px' }}>{customer.city || '-'}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>
                                                    {formatCurrency(customer.spend, customer.currency)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                </>
            )}
        </div>
    );
}
