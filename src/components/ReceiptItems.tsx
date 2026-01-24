import { useState } from 'react';
import { ReceiptItem, Member } from '../types';
import { useApp } from '../context/AppContext';

interface ReceiptItemsProps {
  items: ReceiptItem[];
  members: Member[];
  currency: string;
  totalAmount: number;
  onTotalChange: (total: string) => void;
  onChange: (items: ReceiptItem[]) => void;
  payerId?: string;
}

export function ReceiptItems({ items, members, currency, totalAmount, onTotalChange, onChange, payerId }: ReceiptItemsProps) {
  const { currentUser } = useApp();
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragOverAddButton, setDragOverAddButton] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalValue, setTotalValue] = useState('');

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverItemId(itemId);
  };

  const handleDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData('text/plain');

    if (memberId) {
      onChange(items.map(item =>
        item.id === itemId ? { ...item, memberId } : item
      ));
    }

    setDragOverItemId(null);
  };

  const handleAddButtonDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverAddButton(true);
  };

  const handleAddButtonDragLeave = () => {
    setDragOverAddButton(false);
  };

  const handleAddButtonDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData('text/plain');

    if (memberId) {
      const newItem: ReceiptItem = {
        id: crypto.randomUUID(),
        description: '',
        amount: 0,
        memberId,
      };
      onChange([...items, newItem]);
    }

    setDragOverAddButton(false);
  };

  const handleRemoveAssignment = (itemId: string) => {
    onChange(items.map(item =>
      item.id === itemId ? { ...item, memberId: undefined } : item
    ));
  };

  const handleAmountFocus = (itemId: string, amount: number) => {
    setEditingId(itemId);
    setEditingValue(amount.toString());
  };

  const handleAmountBlur = (itemId: string) => {
    if (editingId === itemId) {
      const newAmount = parseFloat(editingValue) || 0;
      onChange(items.map(item =>
        item.id === itemId ? { ...item, amount: newAmount } : item
      ));
      setEditingId(null);
      setEditingValue('');
    }
  };

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setEditingValue(sanitized);
  };

  const handleDescriptionChange = (itemId: string, description: string) => {
    onChange(items.map(item =>
      item.id === itemId ? { ...item, description } : item
    ));
  };

  const handleRemoveItem = (itemId: string) => {
    onChange(items.filter(item => item.id !== itemId));
  };

  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      id: crypto.randomUUID(),
      description: '',
      amount: 0,
    };
    onChange([...items, newItem]);
  };

  const handleTotalFocus = () => {
    setEditingTotal(true);
    setTotalValue(totalAmount > 0 ? totalAmount.toString() : '');
  };

  const handleTotalBlur = () => {
    if (editingTotal) {
      onTotalChange(totalValue);
      setEditingTotal(false);
      setTotalValue('');
    }
  };

  const handleTotalInputChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setTotalValue(sanitized);
  };

  return (
    <div className="space-y-2">
      {/* Total row - editable */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-cyan-900/30 border border-cyan-600">
        <span className="w-20 flex-shrink-0" />
        <span className="flex-1 text-sm font-semibold text-cyan-100">Total</span>
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={editingTotal ? totalValue : totalAmount.toString()}
            onChange={(e) => handleTotalInputChange(e.target.value)}
            onFocus={handleTotalFocus}
            onBlur={handleTotalBlur}
            className="w-16 bg-gray-700 border border-cyan-600 rounded px-2 py-1 text-right text-sm font-semibold text-cyan-100"
          />
          <span className="text-xs text-cyan-300">{currency}</span>
        </div>
        <span className="w-6" />
      </div>
      
      {/* Items */}
      {items.map(item => {
        const isOver = dragOverItemId === item.id;
        const assignedMember = item.memberId ? members.find(m => m.id === item.memberId) : null;
        const isEditing = editingId === item.id;

        return (
          <div
            key={item.id}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, item.id)}
            className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
              isOver
                ? 'bg-cyan-900/50 border-2 border-cyan-500 border-dashed'
                : 'bg-gray-800'
            }`}
          >
            {/* Assigned member or empty drop zone */}
            <div className="w-20 flex-shrink-0">
              {assignedMember ? (
                <button
                  type="button"
                  onClick={() => handleRemoveAssignment(item.id)}
                  className={`px-2 py-1 text-white text-xs rounded-full hover:bg-red-500 truncate max-w-full transition-colors ${
                    item.memberId === payerId ? 'bg-green-600' : 'bg-cyan-600'
                  }`}
                  title="Click to remove"
                >
                  {currentUser && assignedMember.id === currentUser.id ? 'You' : assignedMember.name}
                </button>
              ) : (
                <div className={`h-7 rounded-full border-2 border-dashed ${
                  isOver ? 'border-cyan-500' : 'border-gray-600'
                }`} />
              )}
            </div>

            {/* Description - editable */}
            <input
              type="text"
              value={item.description}
              onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
              placeholder="Item description"
              className="flex-1 min-w-0 bg-transparent border-none text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1"
            />

            {/* Amount - editable */}
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={isEditing ? editingValue : item.amount.toString()}
                onChange={(e) => handleAmountChange(e.target.value)}
                onFocus={() => handleAmountFocus(item.id, item.amount)}
                onBlur={() => handleAmountBlur(item.id)}
                className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right text-sm text-gray-100"
              />
              <span className="text-xs text-gray-400">{currency}</span>
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => handleRemoveItem(item.id)}
              className="p-1 text-gray-500 hover:text-red-400"
              title="Remove item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        );
      })}


      {/* Add item button - also a drop zone */}
      <button
        type="button"
        onClick={handleAddItem}
        onDragOver={handleAddButtonDragOver}
        onDragLeave={handleAddButtonDragLeave}
        onDrop={handleAddButtonDrop}
        className={`w-full py-2 border-2 border-dashed rounded-lg text-sm transition-all ${
          dragOverAddButton
            ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300'
            : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
        }`}
      >
        + Add item
      </button>
    </div>
  );
}
