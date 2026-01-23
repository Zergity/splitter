import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuthContext, AuthModal } from './auth';

type AuthFlow = 'signin' | 'register' | 'edit-name' | null;

export function MemberSelector() {
  const { group, currentUser, setCurrentUser, addMember, refreshData } = useApp();
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
    updateProfile,
    clearWebAuthnError,
  } = useAuthContext();

  const [authFlow, setAuthFlow] = useState<AuthFlow>(null);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Sync current user with auth session and group data
  useEffect(() => {
    if (authLoading || !group) return;

    if (authenticated && session) {
      const member = group.members.find((m) => m.id === session.memberId);
      if (member) {
        // Update if ID changed OR name changed
        if (currentUser?.id !== member.id || currentUser?.name !== member.name) {
          setCurrentUser(member);
        }
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

  const handleEditName = () => {
    setEditName(currentUser?.name || '');
    setEditError(null);
    setAuthFlow('edit-name');
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;

    setEditLoading(true);
    setEditError(null);
    try {
      const newSession = await updateProfile(editName.trim());
      // Update current user with new name
      if (currentUser) {
        setCurrentUser({ ...currentUser, name: newSession.memberName });
      }
      // Refresh group data to get updated member list
      await refreshData();
      setAuthFlow(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseModal = () => {
    setAuthFlow(null);
    setNewName('');
    setEditName('');
    setEditError(null);
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
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEditName}
            className="text-sm font-medium text-gray-700 hover:text-indigo-600 hover:underline"
            title="Click to edit name"
          >
            {currentUser.name}
          </button>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Logout
          </button>
        </div>

        <AuthModal isOpen={authFlow === 'edit-name'} onClose={handleCloseModal}>
          <div className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">✏️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Edit Name</h2>
              <p className="text-gray-600 mb-6">
                Change your display name.
              </p>

              <div className="mb-6">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  placeholder="Your name"
                  className="w-full border rounded-lg px-3 py-2 text-center"
                  autoFocus
                  disabled={editLoading}
                />
              </div>

              {editError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{editError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCloseModal}
                  disabled={editLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveName}
                  disabled={editLoading || !editName.trim() || editName.trim() === currentUser.name}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </AuthModal>
      </>
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
