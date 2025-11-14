import { firebaseAuth } from '@/lib/firebase/client';

export async function fetchWithAuth<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }

  const token = await currentUser.getIdToken();
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error ?? payload?.details ?? 'Request failed';
    const error = new Error(message);
    // Add additional error details
    if (payload?.details) {
      (error as Error & { details?: string }).details = payload.details;
    }
    if (payload?.name) {
      (error as Error & { name?: string }).name = payload.name;
    }
    console.error('API Error:', { 
      status: response.status, 
      url: input,
      payload: JSON.stringify(payload, null, 2)
    });
    throw error;
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return (await response.json()) as T;
  }

  return undefined as T;
}



