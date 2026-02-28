import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';

interface Props {
  lockName: string;
  passwordHint?: string;
  onSubmit: (password: string) => void;
  onClose: () => void;
}

export default function PasswordModal({ lockName, passwordHint, onSubmit, onClose }: Props) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    onSubmit(password.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-100">輸入密碼</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          對 <span className="text-amber-400">{lockName}</span> 輸入密碼
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={passwordHint ?? '輸入密碼...'}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-center text-lg tracking-widest outline-none focus:border-amber-500"
            autoFocus
            maxLength={20}
          />
          <button
            type="submit"
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors"
          >
            確認
          </button>
        </form>
      </div>
    </div>
  );
}
