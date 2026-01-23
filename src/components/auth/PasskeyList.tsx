import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from './AuthProvider';
import type { PasskeyInfo } from '../../types';

interface PasskeyListProps {
  onAddNew?: () => void;
}

export function PasskeyList({ onAddNew }: PasskeyListProps) {
  const { listPasskeys, deletePasskey, authenticated } = useAuthContext();
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPasskeys = useCallback(async () => {
    if (!authenticated) return;

    try {
      setLoading(true);
      setError(null);
      const keys = await listPasskeys();
      setPasskeys(keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load passkeys');
    } finally {
      setLoading(false);
    }
  }, [authenticated, listPasskeys]);

  useEffect(() => {
    loadPasskeys();
  }, [loadPasskeys]);

  const handleDelete = async (passkeyId: string) => {
    if (passkeys.length <= 1) {
      setError('Cannot delete your only passkey');
      return;
    }

    if (!confirm('Are you sure you want to remove this passkey?')) {
      return;
    }

    try {
      setDeletingId(passkeyId);
      setError(null);
      await deletePasskey(passkeyId);
      setPasskeys(prev => prev.filter(p => p.id !== passkeyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete passkey');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Loading passkeys...
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">Your Passkeys</h3>
        {onAddNew && (
          <button
            onClick={onAddNew}
            className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
          >
            + Add New
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {passkeys.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">🔐</div>
          <p>No passkeys registered yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">🔑</div>
                <div>
                  <div className="font-medium text-gray-100">
                    {passkey.friendlyName || 'Passkey'}
                  </div>
                  <div className="text-xs text-gray-400">
                    Created {formatDate(passkey.createdAt)}
                    {passkey.lastUsedAt && (
                      <> · Last used {formatDate(passkey.lastUsedAt)}</>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(passkey.id)}
                disabled={deletingId === passkey.id || passkeys.length <= 1}
                className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={passkeys.length <= 1 ? 'Cannot delete your only passkey' : 'Remove passkey'}
              >
                {deletingId === passkey.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500 text-center">
        Passkeys are securely stored on your device
      </p>
    </div>
  );
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}
