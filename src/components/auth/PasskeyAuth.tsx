import { useState } from 'react';
import { useAuthContext } from './AuthProvider';
import type { AuthMode, Member } from '../../types';

interface PasskeyAuthProps {
  member: Member;
  mode: AuthMode;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PasskeyAuth({ member, mode, onSuccess, onCancel }: PasskeyAuthProps) {
  const {
    isSupported,
    webAuthnLoading,
    webAuthnError,
    register,
    authenticate,
    clearWebAuthnError,
  } = useAuthContext();

  const [friendlyName, setFriendlyName] = useState('');

  if (!isSupported) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Passkeys Not Supported
          </h2>
          <p className="text-gray-600 mb-6">
            Your browser or device doesn't support passkeys. Please use a modern browser
            on a device with biometric authentication (Face ID, Touch ID, fingerprint).
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Supported browsers: Chrome 109+, Safari 16+, Firefox 122+, Edge 109+
          </p>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleAuth = async () => {
    clearWebAuthnError();
    try {
      if (mode === 'register') {
        await register(member.id, member.name, friendlyName || undefined);
      } else {
        await authenticate(member.id);
      }
      onSuccess();
    } catch {
      // Error is handled by the hook and displayed below
    }
  };

  const isRegister = mode === 'register';
  const title = isRegister ? 'Set Up Passkey' : 'Sign In';
  const description = isRegister
    ? `Create a passkey for ${member.name} to securely access your account using biometrics.`
    : `Sign in as ${member.name} using your passkey.`;
  const buttonText = isRegister ? 'Create Passkey' : 'Sign In with Passkey';
  const icon = isRegister ? '🔐' : '👆';

  return (
    <div className="p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">{icon}</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{description}</p>

        {isRegister && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Device Name (optional)
            </label>
            <input
              type="text"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              placeholder="e.g., iPhone, MacBook"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              disabled={webAuthnLoading}
            />
            <p className="text-xs text-gray-500 text-left mt-1">
              Helps you identify this passkey later
            </p>
          </div>
        )}

        {webAuthnError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{webAuthnError}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={webAuthnLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAuth}
            disabled={webAuthnLoading}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {webAuthnLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Waiting...</span>
              </>
            ) : (
              buttonText
            )}
          </button>
        </div>

        {!isRegister && (
          <p className="mt-4 text-xs text-gray-500">
            Use Face ID, Touch ID, fingerprint, or device PIN to authenticate
          </p>
        )}
      </div>
    </div>
  );
}
