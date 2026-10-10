
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  CheckCircle2,
  Clock,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Package,
  RefreshCw,
  ShoppingBag,
  X,
} from 'lucide-react';
import { api } from './lib/api';

type Donation = {
  _id: string;
  foodName: string;
  foodType?: string;
  quantity: number | string;
  quantityUnit?: string;
  pickupAddress: string;
  expiresAt: string;
  status: string;
};

type PickupRequest = {
  _id: string;
  donationId: Donation | string | null;
  collectorId: string;
  providerId: string;
  collectorMessage?: string;
  providerMessage?: string;
  status: string;
  createdAt?: string;
  reviewedAt?: string;
};

type Props = {
  displayName: string;
  email: string;
  emailVerified: boolean;
  onLogout: () => void;
  logoutBusy: boolean;
  error?: string;
};

type Tab = 'available' | 'requests';

function statusLabel(value: string): string {
  // Compatible with older TypeScript library targets.
  return value.replace(/_/g, ' ');
}

function formatDate(value?: string): string {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleString();
}

function getDonation(
  request: PickupRequest,
): Donation | null {
  if (
    request.donationId &&
    typeof request.donationId === 'object'
  ) {
    return request.donationId;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  return 'Something went wrong. Please try again.';
}

export default function CollectorDashboard({
  displayName,
  email,
  emailVerified,
  onLogout,
  logoutBusy,
  error: accountError,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setPageError('');

    try {
      const [donationResponse, requestResponse] = await Promise.all([
        api<{ data: Donation[] }>('/donations/available'),
        api<{ data: PickupRequest[] }>('/pickup-requests/mine'),
      ]);

      setDonations(
        Array.isArray(donationResponse.data)
          ? donationResponse.data
          : [],
      );

      setRequests(
        Array.isArray(requestResponse.data)
          ? requestResponse.data
          : [],
      );
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const requestPickup = async (donationId: string) => {
    if (!emailVerified) {
      setPageError('Please verify your email before requesting a pickup.');
      return;
    }

    setBusyId(donationId);
    setPageError('');
    setNotice('');

    try {
      await api('/pickup-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId,
          collectorMessage: '',
        }),
      });

      setNotice('Pickup request created successfully.');
      setActiveTab('requests');
      await loadDashboard(false);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyId('');
    }
  };

  const cancelRequest = async (request: PickupRequest) => {
    const canCancel = ['pending', 'accepted'].includes(request.status);

    if (!canCancel) {
      setPageError('This pickup request can no longer be cancelled.');
      return;
    }

    setBusyId(request._id);
    setPageError('');
    setNotice('');

    try {
      await api(`/pickup-requests/${request._id}/cancel`, {
        method: 'PATCH',
      });

      setNotice('Pickup request cancelled.');
      await loadDashboard(false);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyId('');
    }
  };

  const resendVerification = async () => {
    setResendingEmail(true);
    setPageError('');
    setNotice('');

    try {
      const response = await api<{
        data: { message?: string };
      }>('/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      setNotice(
        response.data?.message ||
          'If verification email delivery is configured, check your inbox.',
      );
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setResendingEmail(false);
    }
  };

  const pendingCount = requests.filter(
    (request) => request.status === 'pending',
  ).length;

  const acceptedCount = requests.filter(
    (request) =>
      request.status === 'accepted' ||
      request.status === 'pickup_in_progress',
  ).length;

  const completedCount = requests.filter(
    (request) => request.status === 'completed',
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <ShoppingBag size={23} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                FoodRescue
              </h1>
              <p className="text-sm text-slate-500">
                Collector Dashboard
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            disabled={logoutBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {logoutBusy ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <LogOut size={17} />
            )}
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-600 p-6 text-white shadow-sm sm:p-8">
          <p className="mb-2 text-sm font-medium text-emerald-100">
            YOUR FOODRESCUE SPACE
          </p>

          <h2 className="text-2xl font-bold sm:text-3xl">
            Hello, {displayName || 'Collector'}!
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
            Discover available food donations, request pickups, and
            track your collection requests in one place.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/15 px-3 py-1">
              Collector account
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1">
              {email}
            </span>
          </div>
        </section>

        {!emailVerified && (
          <section className="mb-6 flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Mail
                className="mt-0.5 shrink-0 text-amber-700"
                size={21}
              />
              <div>
                <h3 className="font-semibold text-amber-950">
                  Email verification pending
                </h3>
                <p className="mt-1 text-sm text-amber-900">
                  Verify your email to request food pickups. If the
                  verification email is not arriving, check the email
                  delivery configuration.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resendVerification}
              disabled={resendingEmail}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {resendingEmail ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Mail size={16} />
              )}
              Resend verification
            </button>
          </section>
        )}

        {accountError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {accountError}
          </div>
        )}

        {pageError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{pageError}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setPageError('')}
              className="ml-auto rounded p-1 hover:bg-red-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice('')}
              className="ml-auto rounded p-1 hover:bg-emerald-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Available donations"
            value={loading ? '—' : donations.length}
            icon={<Package size={21} />}
            description="Food currently listed"
          />
          <StatCard
            title="Pending requests"
            value={loading ? '—' : pendingCount}
            icon={<Clock size={21} />}
            description="Waiting for provider review"
          />
          <StatCard
            title="Active pickups"
            value={loading ? '—' : acceptedCount}
            icon={<ShoppingBag size={21} />}
            description="Accepted or in progress"
          />
          <StatCard
            title="Completed pickups"
            value={loading ? '—' : completedCount}
            icon={<CheckCircle2 size={21} />}
            description="Successfully completed"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-bold">
                Manage food pickups
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Browse available donations or track your requests.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadDashboard(false)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? 'animate-spin' : ''}
              />
              Refresh
            </button>
          </div>

          <div className="flex gap-2 border-b border-slate-200 px-5 sm:px-6">
            <TabButton
              active={activeTab === 'available'}
              onClick={() => setActiveTab('available')}
            >
              <Package size={16} />
              Available donations
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {donations.length}
              </span>
            </TabButton>

            <TabButton
              active={activeTab === 'requests'}
              onClick={() => setActiveTab('requests')}
            >
              <Clock size={16} />
              My requests
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {requests.length}
              </span>
            </TabButton>
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-slate-500">
                <LoaderCircle
                  size={30}
                  className="animate-spin text-emerald-600"
                />
                <p className="text-sm">Loading real records...</p>
              </div>
            ) : activeTab === 'available' ? (
              donations.length === 0 ? (
                <EmptyState
                  title="No available donations right now"
                  description="When providers list available food donations, they will appear here."
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {donations.map((donation) => (
                    <article
                      key={donation._id}
                      className="rounded-xl border border-slate-200 p-5 transition hover:border-emerald-300 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold">
                            {donation.foodName}
                          </h3>
                          {donation.foodType && (
                            <p className="mt-1 text-sm text-slate-500">
                              {donation.foodType}
                            </p>
                          )}
                        </div>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
                          {statusLabel(donation.status)}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <p className="flex items-start gap-2">
                          <Package
                            size={17}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />
                          <span>
                            <strong className="text-slate-800">
                              Quantity:
                            </strong>{' '}
                            {donation.quantity}{' '}
                            {donation.quantityUnit || ''}
                          </span>
                        </p>

                        <p className="flex items-start gap-2">
                          <MapPin
                            size={17}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />
                          <span>
                            <strong className="text-slate-800">
                              Pickup location:
                            </strong>{' '}
                            {donation.pickupAddress}
                          </span>
                        </p>

                        <p className="flex items-start gap-2">
                          <Clock
                            size={17}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />
                          <span>
                            <strong className="text-slate-800">
                              Expires:
                            </strong>{' '}
                            {formatDate(donation.expiresAt)}
                          </span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void requestPickup(donation._id)}
                        disabled={
                          !emailVerified ||
                          busyId === donation._id ||
                          donation.status !== 'available'
                        }
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyId === donation._id ? (
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <ShoppingBag size={17} />
                        )}
                        {emailVerified
                          ? 'Request pickup'
                          : 'Verify email to request'}
                      </button>
                    </article>
                  ))}
                </div>
              )
            ) : requests.length === 0 ? (
              <EmptyState
                title="No pickup requests yet"
                description="When you request an available donation, your requests and their statuses will appear here."
              />
            ) : (
              <div className="space-y-4">
                {requests.map((request) => {
                  const donation = getDonation(request);
                  const canCancel = ['pending', 'accepted'].includes(
                    request.status,
                  );

                  return (
                    <article
                      key={request._id}
                      className="rounded-xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold">
                            {donation?.foodName || 'Food donation'}
                          </h3>

                          {donation && (
                            <p className="mt-1 text-sm text-slate-500">
                              Quantity: {donation.quantity}{' '}
                              {donation.quantityUnit || ''}
                            </p>
                          )}

                          {donation?.pickupAddress && (
                            <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                              <MapPin
                                size={16}
                                className="mt-0.5 shrink-0"
                              />
                              {donation.pickupAddress}
                            </p>
                          )}

                          <p className="mt-2 text-xs text-slate-400">
                            Requested: {formatDate(request.createdAt)}
                          </p>
                        </div>

                        <span className="inline-flex w-fit shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize text-slate-700">
                          {statusLabel(request.status)}
                        </span>
                      </div>

                      {request.providerMessage && (
                        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="font-semibold text-slate-700">
                            Provider message
                          </p>
                          <p className="mt-1 text-slate-600">
                            {request.providerMessage}
                          </p>
                        </div>
                      )}

                      {canCancel && (
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => void cancelRequest(request)}
                            disabled={busyId === request._id}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            {busyId === request._id ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <X size={16} />
                            )}
                            Cancel request
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-8 flex flex-col items-center justify-between gap-2 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
          <p>FoodRescue · Reducing food waste together</p>
          <button
            type="button"
            onClick={() => void loadDashboard(false)}
            className="inline-flex items-center gap-1 hover:text-slate-600"
          >
            Back to latest records <ArrowDown size={13} />
          </button>
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </article>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-2 py-4 text-sm font-semibold ${
        active
          ? 'border-emerald-600 text-emerald-700'
          : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
        <Package size={28} />
      </div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}
