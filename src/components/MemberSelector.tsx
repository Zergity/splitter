import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuthContext, AuthModal, PasskeyAuth } from './auth';
import type { Member, AuthMode } from '../types';

export function MemberSelector() {
  const { group, currentUser, setCurrentUser, addMember } = useApp();
  const { authenticated, session, loading: authLoading, logout, checkHasPasskeys, isSupported } = useAuthContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [authModal, setAuthModal] = useState<{ member: Member; mode: AuthMode } | null>(null);

  // Sync current user with auth session
  useEffect(() => {
    if (authLoading || !group) return;

    if (authenticated && session) {
      // User is authenticated - find the member and set as current user
      const member = group.members.find((m) => m.id === session.memberId);
      if (member && currentUser?.id !== member.id) {
        setCurrentUser(member);
      }
    } else if (!authenticated && currentUser) {
      // User is not authenticated but has a current user - clear it
      setCurrentUser(null);
    }
  }, [authenticated, session, authLoading, group, currentUser, setCurrentUser]);

  if (!group) return null;

  const handleAddMember = async () => {
    if (newName.trim()) {
      // Backend deduplicates - if name exists, it removes duplicates
      const newMember = await addMember(newName.trim());
      setNewName('');
      setIsAdding(false);

      // If we got a new member back, prompt them to set up a passkey
      if (newMember && isSupported) {
        setAuthModal({ member: newMember, mode: 'register' });
      }
    }
  };

  const handleSelectMember = async (memberId: string) => {
    if (!memberId) {
      // User selected "Select user" option - do nothing or logout
      return;
    }

    const member = group.members.find((m) => m.id === memberId);
    if (!member) return;

    // Check if user is already authenticated as this member
    if (authenticated && currentUser?.id === memberId) {
      return; // Already logged in as this user
    }

    // Check if member has passkeys
    const hasPasskeys = await checkHasPasskeys(memberId);

    if (hasPasskeys) {
      // Member has passkeys - show login modal
      setAuthModal({ member, mode: 'login' });
    } else {
      // Member has no passkeys - show registration modal
      setAuthModal({ member, mode: 'register' });
    }
  };

  const handleAuthSuccess = () => {
    if (authModal) {
      setCurrentUser(authModal.member);
    }
    setAuthModal(null);
  };

  const handleAuthCancel = () => {
    setAuthModal(null);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {isAdding ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
              placeholder="Name"
              className="border rounded px-2 py-1 text-sm w-24"
              autoFocus
            />
            <button
              onClick={handleAddMember}
              className="text-indigo-600 text-sm font-medium"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewName('');
              }}
              className="text-gray-500 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {authenticated && currentUser ? (
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
            ) : (
              <>
                <select
                  value=""
                  onChange={(e) => handleSelectMember(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select user</option>
                  {group.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsAdding(true)}
                  className="text-indigo-600 text-sm font-medium"
                >
                  + Add
                </button>
              </>
            )}
          </>
        )}
      </div>

      <AuthModal isOpen={!!authModal} onClose={handleAuthCancel}>
        {authModal && (
          <PasskeyAuth
            member={authModal.member}
            mode={authModal.mode}
            onSuccess={handleAuthSuccess}
            onCancel={handleAuthCancel}
          />
        )}
      </AuthModal>
    </>
  );
}
