import { useState } from 'react';
import { useApp } from '../context/AppContext';

export function MemberSelector() {
  const { group, currentUser, setCurrentUser, addMember } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  if (!group) return null;

  const handleAddMember = async () => {
    if (newName.trim()) {
      await addMember(newName.trim());
      setNewName('');
      setIsAdding(false);
    }
  };

  return (
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
          <select
            value={currentUser?.id || ''}
            onChange={(e) => {
              const member = group.members.find((m) => m.id === e.target.value);
              setCurrentUser(member || null);
            }}
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
    </div>
  );
}
