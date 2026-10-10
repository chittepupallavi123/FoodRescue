
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { api } from './lib/api';

type Donation = {
  _id?: string;
  id?: string;
  foodName: string;
  description?: string;
  foodType: string;
  quantity: number;
  quantityUnit: string;
  preparedAt: string;
  expiresAt: string;
  restaurantName?: string;
  area?: string;
  district?: string;
  state?: string;
  pincode?: string;
  pickupAddress: string;
  pickupInstructions?: string;
  status: string;
};

type Collector = {
  displayName?: string;
  email?: string;
};

type PickupRequest = {
  _id?: string;
  id?: string;
  donationId: Donation | string;
  collectorId: Collector | string;
  collectorMessage?: string;
  providerMessage?: string;
  status: string;
  createdAt?: string;
};

type Props = {
  displayName: string;
  onLogout: () => void;
  logoutBusy: boolean;
  error: string;
};

const initialForm = {
  foodName: '',
  description: '',
  foodType: 'cooked-meals',
  quantity: '1',
  quantityUnit: 'meals',
  preparedAt: '',
  expiresAt: '',
  restaurantName: '',
  area: '',
  district: '',
  state: '',
  pincode: '',
  pickupAddress: '',
  pickupInstructions: '',
};

function recordId(record: { _id?: string; id?: string }): string {
  return record._id || record.id || '';
}

function dateLabel(value?: string): string {
  if (!value) return 'Not available';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleString();
}

function statusLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function locationLabel(donation: Donation): string {
  return [
    donation.area,
    donation.district,
    donation.state,
    donation.pincode,
  ]
    .filter(Boolean)
    .join(', ');
}

export default function ProviderDashboard({
  displayName,
  onLogout,
  logoutBusy,
  error: accountError,
}: Props) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    setLoading(true);

    try {
      const [donationResult, requestResult] = await Promise.all([
        api<{ data: Donation[] }>('/donations/mine'),
        api<{ data: PickupRequest[] }>('/pickup-requests/provider'),
      ]);

      setDonations(donationResult.data);
      setRequests(requestResult.data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not load dashboard data.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function updateForm(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function createDonation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const requiredFields: Array<keyof typeof initialForm> = [
      'foodName',
      'restaurantName',
      'area',
      'district',
      'state',
      'pincode',
      'pickupAddress',
      'quantity',
    ];

    if (requiredFields.some((field) => !form[field].trim())) {
      setError('Complete all required donation and location fields.');
      return;
    }

    if (!/^[1-9]\d{5}$/.test(form.pincode.trim())) {
      setError('Enter a valid 6-digit Indian PIN code.');
      return;
    }

    const quantity = Number(form.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantity must be a number greater than zero.');
      return;
    }

    if (!form.preparedAt || !form.expiresAt) {
      setError('Enter both preparation and expiry times.');
      return;
    }

    const prepared = new Date(form.preparedAt);
    const expires = new Date(form.expiresAt);
    const now = new Date();

    if (
      Number.isNaN(prepared.getTime()) ||
      Number.isNaN(expires.getTime())
    ) {
      setError('Enter valid preparation and expiry times.');
      return;
    }

    if (prepared > now) {
      setError('Preparation time cannot be in the future.');
      return;
    }

    if (expires <= prepared || expires <= now) {
      setError(
        'Expiry time must be after preparation and in the future.',
      );
      return;
    }

    setSaving(true);

    try {
      await api<{ data: Donation }>('/donations', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          foodName: form.foodName.trim(),
          description: form.description.trim(),
          quantity,
          restaurantName: form.restaurantName.trim(),
          area: form.area.trim(),
          district: form.district.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          pickupAddress: form.pickupAddress.trim(),
          pickupInstructions: form.pickupInstructions.trim(),
          preparedAt: prepared.toISOString(),
          expiresAt: expires.toISOString(),
        }),
      });

      setForm({ ...initialForm });
      setMessage('Donation created successfully.');
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not create donation.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function reviewRequest(
    id: string,
    decision: 'accepted' | 'rejected',
  ) {
    if (!id) {
      setError('Pickup request ID is missing.');
      return;
    }

    setError('');
    setMessage('');
    setWorkingId(id);

    try {
      await api(`/pickup-requests/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ decision }),
      });

      setMessage(`Pickup request ${decision}.`);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not review request.',
      );
    } finally {
      setWorkingId('');
    }
  }

  async function updatePickup(
    id: string,
    status: 'pickup_in_progress' | 'completed',
  ) {
    if (!id) {
      setError('Pickup request ID is missing.');
      return;
    }

    setError('');
    setMessage('');
    setWorkingId(id);

    try {
      await api(`/pickup-requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setMessage(`Pickup marked as ${statusLabel(status)}.`);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not update pickup.',
      );
    } finally {
      setWorkingId('');
    }
  }

  async function cancelDonation(id: string) {
    if (!id) {
      setError('Donation ID is missing.');
      return;
    }

    if (!window.confirm('Cancel this available donation?')) {
      return;
    }

    setError('');
    setMessage('');
    setWorkingId(id);

    try {
      await api(`/donations/${id}/cancel`, {
        method: 'PATCH',
      });

      setMessage('Donation cancelled.');
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not cancel donation.',
      );
    } finally {
      setWorkingId('');
    }
  }

  return (
    <section className="provider-dashboard">
      <div className="provider-dashboard-heading">
        <div>
          <div className="section-kicker">PROVIDER WORKSPACE</div>
          <h1>
            Hello, <em>{displayName}.</em>
          </h1>
          <p>Manage your surplus food and coordinate pickups.</p>
        </div>

        <button
          type="button"
          className="button button-small"
          onClick={onLogout}
          disabled={logoutBusy}
        >
          {logoutBusy ? 'Signing out...' : 'Sign out'}
        </button>
      </div>

      {(error || accountError) && (
        <div className="form-error" role="alert">
          {error || accountError}
        </div>
      )}

      {message && (
        <div className="form-success" role="status">
          {message}
        </div>
      )}

      <div className="provider-dashboard-grid">
        <section className="provider-panel">
          <div className="section-kicker">01 / NEW LISTING</div>
          <h2>Create a donation</h2>
          <p>
            Enter accurate food details and a realistic pickup deadline.
          </p>

          <form className="auth-form" onSubmit={createDonation}>
            <label className="field">
              <span>Food name</span>
              <input
                name="foodName"
                value={form.foodName}
                onChange={updateForm}
                placeholder="e.g. Vegetable rice"
                minLength={2}
                maxLength={120}
                required
              />
            </label>

            <label className="field">
              <span>Food type</span>
              <select
                name="foodType"
                value={form.foodType}
                onChange={updateForm}
                required
              >
                <option value="cooked-meals">Cooked meals</option>
                <option value="bakery">Bakery</option>
                <option value="fruits-vegetables">
                  Fruits and vegetables
                </option>
                <option value="packaged-food">Packaged food</option>
                <option value="dairy">Dairy</option>
                <option value="other">Other</option>
              </select>
            </label>

            <div className="provider-form-row">
              <label className="field">
                <span>Quantity</span>
                <input
                  name="quantity"
                  type="number"
                  value={form.quantity}
                  onChange={updateForm}
                  min="0.01"
                  step="any"
                  required
                />
              </label>

              <label className="field">
                <span>Unit</span>
                <select
                  name="quantityUnit"
                  value={form.quantityUnit}
                  onChange={updateForm}
                  required
                >
                  <option value="meals">Meals</option>
                  <option value="kg">Kilograms</option>
                  <option value="packs">Packs</option>
                  <option value="portions">Portions</option>
                  <option value="items">Items</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>Description and food handling details</span>
              <textarea
                name="description"
                value={form.description}
                onChange={updateForm}
                rows={3}
                maxLength={1000}
                placeholder="Include ingredients or allergen details where known."
              />
            </label>

            <label className="field">
              <span>Preparation date and time</span>
              <input
                type="datetime-local"
                name="preparedAt"
                value={form.preparedAt}
                onChange={updateForm}
                required
              />
            </label>

            <label className="field">
              <span>Expiry / pickup deadline</span>
              <input
                type="datetime-local"
                name="expiresAt"
                value={form.expiresAt}
                onChange={updateForm}
                required
              />
            </label>

            <div className="section-kicker">PICKUP LOCATION</div>

            <label className="field">
              <span>Restaurant / organization name</span>
              <input
                name="restaurantName"
                value={form.restaurantName}
                onChange={updateForm}
                placeholder="e.g. Green Leaf Restaurant"
                minLength={2}
                maxLength={150}
                required
              />
            </label>

            <label className="field">
              <span>Area / locality</span>
              <input
                name="area"
                value={form.area}
                onChange={updateForm}
                placeholder="e.g. Madhapur"
                minLength={2}
                maxLength={120}
                required
              />
            </label>

            <div className="provider-form-row">
              <label className="field">
                <span>District</span>
                <input
                  name="district"
                  value={form.district}
                  onChange={updateForm}
                  placeholder="e.g. Hyderabad"
                  minLength={2}
                  maxLength={120}
                  required
                />
              </label>

              <label className="field">
                <span>State</span>
                <input
                  name="state"
                  value={form.state}
                  onChange={updateForm}
                  placeholder="e.g. Telangana"
                  minLength={2}
                  maxLength={120}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>PIN code</span>
              <input
                name="pincode"
                value={form.pincode}
                onChange={updateForm}
                placeholder="6-digit PIN code"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                pattern="[1-9][0-9]{5}"
                title="Enter a valid 6-digit Indian PIN code."
                required
              />
            </label>

            <label className="field">
              <span>Full pickup address</span>
              <textarea
                name="pickupAddress"
                value={form.pickupAddress}
                onChange={updateForm}
                rows={2}
                minLength={5}
                maxLength={500}
                required
                placeholder="Building, street, and landmark"
              />
            </label>

            <label className="field">
              <span>Pickup instructions (optional)</span>
              <textarea
                name="pickupInstructions"
                value={form.pickupInstructions}
                onChange={updateForm}
                rows={2}
                maxLength={1000}
                placeholder="Collection point or contact instructions"
              />
            </label>

            <button
              type="submit"
              className="button form-submit"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Publish donation'}
            </button>
          </form>
        </section>

        <section className="provider-panel">
          <div className="section-kicker">02 / YOUR LISTINGS</div>
          <h2>My donations</h2>
          <p>Statuses below come from your saved donation records.</p>

          {loading ? (
            <p>Loading donations...</p>
          ) : donations.length === 0 ? (
            <div className="provider-empty">
              <strong>No donations yet</strong>
              <p>Create your first listing using the form.</p>
            </div>
          ) : (
            <div className="provider-record-list">
              {donations.map((donation, index) => {
                const id = recordId(donation);
                const location = locationLabel(donation);

                return (
                  <article
                    className="provider-record"
                    key={id || `donation-${index}`}
                  >
                    <div className="provider-record-top">
                      <h3>{donation.foodName}</h3>
                      <span
                        className={`provider-status status-${donation.status}`}
                      >
                        {statusLabel(donation.status)}
                      </span>
                    </div>

                    <p>
                      {donation.quantity} {donation.quantityUnit} ·{' '}
                      {statusLabel(donation.foodType)}
                    </p>

                    {donation.restaurantName && (
                      <p>
                        <strong>Restaurant / organization:</strong>{' '}
                        {donation.restaurantName}
                      </p>
                    )}

                    {location && (
                      <p>
                        <strong>Location:</strong> {location}
                      </p>
                    )}

                    <p>
                      <strong>Pickup address:</strong>{' '}
                      {donation.pickupAddress}
                    </p>

                    <p>
                      <strong>Prepared:</strong>{' '}
                      {dateLabel(donation.preparedAt)}
                    </p>

                    <p>
                      <strong>Expires:</strong>{' '}
                      {dateLabel(donation.expiresAt)}
                    </p>

                    {donation.description && <p>{donation.description}</p>}

                    {donation.pickupInstructions && (
                      <p>
                        <strong>Instructions:</strong>{' '}
                        {donation.pickupInstructions}
                      </p>
                    )}

                    {donation.status === 'available' && (
                      <button
                        type="button"
                        className="button button-small"
                        onClick={() => void cancelDonation(id)}
                        disabled={!id || workingId === id}
                      >
                        {workingId === id
                          ? 'Working...'
                          : 'Cancel donation'}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="provider-panel provider-requests-panel">
          <div className="section-kicker">03 / COLLECTIONS</div>
          <h2>Pickup requests</h2>
          <p>Review requests and track each accepted pickup.</p>

          {loading ? (
            <p>Loading pickup requests...</p>
          ) : requests.length === 0 ? (
            <div className="provider-empty">
              <strong>No pickup requests yet</strong>
              <p>
                Requests will appear here when collectors request your
                donations.
              </p>
            </div>
          ) : (
            <div className="provider-record-list">
              {requests.map((request, index) => {
                const id = recordId(request);

                const donation =
                  typeof request.donationId === 'object' &&
                  request.donationId !== null
                    ? request.donationId
                    : null;

                const collector =
                  typeof request.collectorId === 'object' &&
                  request.collectorId !== null
                    ? request.collectorId
                    : null;

                return (
                  <article
                    className="provider-record"
                    key={id || `request-${index}`}
                  >
                    <div className="provider-record-top">
                      <h3>{donation?.foodName || 'Donation'}</h3>
                      <span
                        className={`provider-status status-${request.status}`}
                      >
                        {statusLabel(request.status)}
                      </span>
                    </div>

                    <p>
                      <strong>Collector:</strong>{' '}
                      {collector?.displayName || 'Collector'}
                    </p>

                    {collector?.email && <p>{collector.email}</p>}

                    <p>
                      <strong>Requested:</strong>{' '}
                      {dateLabel(request.createdAt)}
                    </p>

                    {request.collectorMessage && (
                      <p>
                        <strong>Message:</strong>{' '}
                        {request.collectorMessage}
                      </p>
                    )}

                    {request.providerMessage && (
                      <p>
                        <strong>Your response:</strong>{' '}
                        {request.providerMessage}
                      </p>
                    )}

                    <div className="provider-action-row">
                      {request.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            className="button button-small"
                            onClick={() =>
                              void reviewRequest(id, 'accepted')
                            }
                            disabled={!id || workingId === id}
                          >
                            {workingId === id ? 'Working...' : 'Accept'}
                          </button>

                          <button
                            type="button"
                            className="button button-small button-secondary"
                            onClick={() =>
                              void reviewRequest(id, 'rejected')
                            }
                            disabled={!id || workingId === id}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {request.status === 'accepted' && (
                        <button
                          type="button"
                          className="button button-small"
                          onClick={() =>
                            void updatePickup(id, 'pickup_in_progress')
                          }
                          disabled={!id || workingId === id}
                        >
                          {workingId === id ? 'Working...' : 'Start pickup'}
                        </button>
                      )}

                      {request.status === 'pickup_in_progress' && (
                        <button
                          type="button"
                          className="button button-small"
                          onClick={() => void updatePickup(id, 'completed')}
                          disabled={!id || workingId === id}
                        >
                          {workingId === id
                            ? 'Working...'
                            : 'Mark completed'}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="provider-dashboard-footer">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => void refresh()}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh dashboard'}
        </button>
      </div>
    </section>
  );
}
