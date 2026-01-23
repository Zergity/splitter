import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuthContext, AuthModal } from './auth';

type AuthFlow = 'signin' | 'register' | null;

export function MemberSelector() {
  const { group, currentUser, setCurrentUser, addMember } = useApp();
  const {
    authenticated,
    session,
    loading: authLoading,
    isSupported,
    webAuthnLoading,
    webAuthnError,
    authenticate,
    register,
    logout,
    clearWebAuthnError,
  } = useAuthContext();

  const [authFlow, setAuthFlow] = useState<AuthFlow>(null);
  const [newName, setNewName] = useState('');

  // Sync current user with auth session
  useEffect(() => {
    if (authLoading || !group) return;

    if (authenticated && session) {
      const member = group.members.find((m) => m.id === session.memberId);
      if (member && currentUser?.id !== member.id) {
        setCurrentUser(member);
      }
    } else if (!authenticated && currentUser) {
      setCurrentUser(null);
    }
  }, [authenticated, session, authLoading, group, currentUser, setCurrentUser]);

  const handleSignIn = async () => {
    clearWebAuthnError();
    setAuthFlow('signin');
    try {
      await authenticate();
      setAuthFlow(null);
    } catch {
      // Error shown in UI
    }
  };

  const handleRegister = async () => {
    if (!newName.trim()) return;

    clearWebAuthnError();
    try {
      // Create new member
      const member = await addMember(newName.trim());
      if (!member) {
        throw new Error('Failed to create member');
      }

      // Register passkey for new member
      await register(member.id, member.name);
      setNewName('');
      setAuthFlow(null);
    } catch {
      // Error shown in UI
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  const handleCloseModal = () => {
    setAuthFlow(null);
    setNewName('');
    clearWebAuthnError();
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-red-600">
        Passkeys not supported
      </div>
    );
  }

  // Show loading state
  if (authLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  // Authenticated state
  if (authenticated && currentUser) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          {currentUser.name}
        </span>
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          Logout
        </button>
      </div>
    );
  }

  // Not authenticated state
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSignIn}
          disabled={webAuthnLoading}
          className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {webAuthnLoading && authFlow === 'signin' ? 'Signing in...' : 'Sign In'}
        </button>
        <button
          onClick={() => setAuthFlow('register')}
          disabled={webAuthnLoading}
          className="text-indigo-600 text-sm font-medium hover:text-indigo-800 disabled:opacity-50"
        >
          New User
        </button>
      </div>

      <AuthModal isOpen={authFlow === 'register'} onClose={handleCloseModal}>
        <div className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">👤</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-600 mb-6">
              Enter your name to create an account with passkey authentication.
            </p>

            <div className="mb-6">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                placeholder="Your name"
                className="w-full border rounded-lg px-3 py-2 text-center"
                autoFocus
                disabled={webAuthnLoading}
              />
            </div>

            {webAuthnError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{webAuthnError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                disabled={webAuthnLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRegister}
                disabled={webAuthnLoading || !newName.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {webAuthnLoading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      </AuthModal>

      <AuthModal isOpen={authFlow === 'signin' && !!webAuthnError} onClose={handleCloseModal}>
        <div className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign In Failed</h2>

            {webAuthnError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{webAuthnError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSignIn}
                disabled={webAuthnLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </AuthModal>
    </>
  );
}
