'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Save, 
  Plus, 
  Trash2, 
  Edit2,
  Key,
  Globe,
  User,
  Lock,
  Bot,
  X
} from 'lucide-react';
import { useToast } from '@/app/components/ToastProvider';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Settings {
  openaiApiKey: string | null;
  wordpressEnglishUrl: string | null;
  wordpressEnglishUsername: string | null;
  wordpressEnglishPassword: string | null;
  wordpressFrenchUrl: string | null;
  wordpressFrenchUsername: string | null;
  wordpressFrenchPassword: string | null;
  autoMode: boolean;
  autoModeMinChars: number;
  autoModeRequireMedia: boolean;
}

interface Account {
  id: number;
  name: string;
  username: string;
  user_id: string;
  created_at: string;
}

async function fetchSettings(): Promise<Settings> {
  const response = await fetch('/api/settings');
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

async function fetchAccounts(): Promise<Account[]> {
  const response = await fetch('/api/accounts');
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [testingConnection, setTestingConnection] = useState<{
    type: 'english' | 'french' | null;
    status: 'testing' | 'success' | 'error' | null;
    message?: string;
  }>({ type: null, status: null });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache (gcTime replaces cacheTime in React Query v5)
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const [formData, setFormData] = useState<Partial<Settings>>({
    autoMode: false,
    autoModeMinChars: 100,
    autoModeRequireMedia: true,
  });
  const [accountForm, setAccountForm] = useState({ name: '', username: '', user_id: '' });

  useEffect(() => {
    if (settings && typeof settings === 'object' && 'autoMode' in settings) {
      setFormData({
        ...settings,
        autoMode: settings.autoMode ?? false,
        autoModeMinChars: settings.autoModeMinChars || 100,
        autoModeRequireMedia: settings.autoModeRequireMedia !== undefined ? settings.autoModeRequireMedia : true,
      });
    }
  }, [settings]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.openaiApiKey && !formData.openaiApiKey.startsWith('sk-')) {
      newErrors.openaiApiKey = 'OpenAI API key should start with "sk-"';
    }

    if (formData.wordpressEnglishUrl && !formData.wordpressEnglishUrl.match(/^https?:\/\/.+/)) {
      newErrors.wordpressEnglishUrl = 'Please enter a valid URL';
    }

    if (formData.wordpressFrenchUrl && !formData.wordpressFrenchUrl.match(/^https?:\/\/.+/)) {
      newErrors.wordpressFrenchUrl = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.showError('Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save settings');
      }

      // Invalidate and refetch settings to ensure UI is updated
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      await queryClient.refetchQueries({ queryKey: ['settings'] });
      toast.showSuccess('Settings saved successfully!');
    } catch (error: any) {
      toast.showError(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testWordPressConnection = async (type: 'english' | 'french') => {
    const url = type === 'english' ? formData.wordpressEnglishUrl : formData.wordpressFrenchUrl;
    const username = type === 'english' ? formData.wordpressEnglishUsername : formData.wordpressFrenchUsername;
    const password = type === 'english' ? formData.wordpressEnglishPassword : formData.wordpressFrenchPassword;

    if (!url || !username || !password) {
      toast.showWarning(`Please fill in all ${type} WordPress credentials first`);
      return;
    }

    setTestingConnection({ type, status: 'testing' });

    try {
      const response = await fetch(`/api/settings/test-wordpress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestingConnection({
          type,
          status: 'success',
          message: 'Connection successful!',
        });
        toast.showSuccess(`${type === 'english' ? 'English' : 'French'} WordPress connection successful!`);
      } else {
        throw new Error(data.message || 'Connection failed');
      }
    } catch (error: any) {
      setTestingConnection({
        type,
        status: 'error',
        message: error.message || 'Connection failed',
      });
      toast.showError(`${type === 'english' ? 'English' : 'French'} WordPress connection failed: ${error.message}`);
    }
  };

  const handleAddAccount = async () => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add account');
      }

      setAccountForm({ name: '', username: '', user_id: '' });
      setShowAddAccount(false);
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.showSuccess('Account added successfully!');
    } catch (error: any) {
      toast.showError(error.message || 'Failed to add account');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;

    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete account');
      }

      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.showSuccess('Account deleted successfully!');
    } catch (error: any) {
      toast.showError(error.message || 'Failed to delete account');
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;

    try {
      const response = await fetch(`/api/accounts/${editingAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update account');
      }

      setEditingAccount(null);
      setAccountForm({ name: '', username: '', user_id: '' });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.showSuccess('Account updated successfully!');
    } catch (error: any) {
      toast.showError(error.message || 'Failed to update account');
    }
  };

  if (settingsLoading || accountsLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Configure your API keys and WordPress credentials
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* OpenAI Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Key className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">OpenAI API</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={formData.openaiApiKey || ''}
              onChange={(e) => {
                setFormData({ ...formData, openaiApiKey: e.target.value });
                if (errors.openaiApiKey) {
                  setErrors({ ...errors, openaiApiKey: '' });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.openaiApiKey ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="sk-..."
            />
            {errors.openaiApiKey && (
              <p className="mt-1 text-sm text-red-600">{errors.openaiApiKey}</p>
            )}
          </div>
        </div>
      </div>

      {/* WordPress English Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Globe className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">WordPress English</h2>
          </div>
          <button
            onClick={() => testWordPressConnection('english')}
            disabled={testingConnection.type === 'english' && testingConnection.status === 'testing'}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {testingConnection.type === 'english' && testingConnection.status === 'testing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : testingConnection.type === 'english' && testingConnection.status === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                Connected
              </>
            ) : testingConnection.type === 'english' && testingConnection.status === 'error' ? (
              <>
                <XCircle className="h-4 w-4 text-red-600" />
                Failed
              </>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL
            </label>
            <input
              type="text"
              value={formData.wordpressEnglishUrl || ''}
              onChange={(e) => {
                setFormData({ ...formData, wordpressEnglishUrl: e.target.value });
                if (errors.wordpressEnglishUrl) {
                  setErrors({ ...errors, wordpressEnglishUrl: '' });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.wordpressEnglishUrl ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="https://example.com/blog"
            />
            {errors.wordpressEnglishUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.wordpressEnglishUrl}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={formData.wordpressEnglishUsername || ''}
              onChange={(e) => setFormData({ ...formData, wordpressEnglishUsername: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.wordpressEnglishPassword || ''}
              onChange={(e) => setFormData({ ...formData, wordpressEnglishPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      {/* WordPress French Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Globe className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">WordPress French</h2>
          </div>
          <button
            onClick={() => testWordPressConnection('french')}
            disabled={testingConnection.type === 'french' && testingConnection.status === 'testing'}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {testingConnection.type === 'french' && testingConnection.status === 'testing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : testingConnection.type === 'french' && testingConnection.status === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                Connected
              </>
            ) : testingConnection.type === 'french' && testingConnection.status === 'error' ? (
              <>
                <XCircle className="h-4 w-4 text-red-600" />
                Failed
              </>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL
            </label>
            <input
              type="text"
              value={formData.wordpressFrenchUrl || ''}
              onChange={(e) => {
                setFormData({ ...formData, wordpressFrenchUrl: e.target.value });
                if (errors.wordpressFrenchUrl) {
                  setErrors({ ...errors, wordpressFrenchUrl: '' });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.wordpressFrenchUrl ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="https://example.com/blog"
            />
            {errors.wordpressFrenchUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.wordpressFrenchUrl}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={formData.wordpressFrenchUsername || ''}
              onChange={(e) => setFormData({ ...formData, wordpressFrenchUsername: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.wordpressFrenchPassword || ''}
              onChange={(e) => setFormData({ ...formData, wordpressFrenchPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      {/* Auto Mode */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Bot className="h-5 w-5 text-gray-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Auto Mode</h2>
              <p className="text-sm text-gray-600">Automatically generate articles for tweets that meet criteria</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.autoMode === true}
              onChange={async (e) => {
                const newValue = e.target.checked;
                setFormData({ ...formData, autoMode: newValue });
                // Auto-save auto mode setting immediately
                try {
                  await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ autoMode: newValue }),
                  });
                  await queryClient.invalidateQueries({ queryKey: ['settings'] });
                } catch (error) {
                  console.error('Error auto-saving auto mode:', error);
                }
              }}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
              formData.autoMode === true ? 'bg-blue-600' : 'bg-gray-200'
            } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300`}></div>
          </label>
        </div>

        {formData.autoMode && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.autoModeRequireMedia !== false}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    setFormData({ ...formData, autoModeRequireMedia: newValue });
                    // Auto-save immediately
                    try {
                      await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ autoModeRequireMedia: newValue }),
                      });
                      await queryClient.invalidateQueries({ queryKey: ['settings'] });
                    } catch (error) {
                      console.error('Error auto-saving require media setting:', error);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Require Media (Image)</span>
              </label>
              <p className="text-xs text-gray-500 ml-6">Only generate articles for tweets that have images</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Character Count
              </label>
              <input
                type="number"
                min="0"
                value={formData.autoModeMinChars || 100}
                onChange={async (e) => {
                  const newValue = parseInt(e.target.value) || 100;
                  setFormData({ ...formData, autoModeMinChars: newValue });
                  // Auto-save after a short delay to avoid too many requests
                  setTimeout(async () => {
                    try {
                      await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ autoModeMinChars: newValue }),
                      });
                      await queryClient.invalidateQueries({ queryKey: ['settings'] });
                    } catch (error) {
                      console.error('Error auto-saving min chars setting:', error);
                    }
                  }, 500);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="100"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum tweet length (in characters) to generate articles</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Auto Mode Criteria:</strong> Articles will be automatically generated for tweets that have{' '}
                {formData.autoModeRequireMedia !== false ? 'media (images) and ' : ''}
                at least {formData.autoModeMinChars || 100} characters.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Twitter/X Accounts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Twitter/X Accounts</h2>
          </div>
          <button
            onClick={() => {
              setShowAddAccount(true);
              setEditingAccount(null);
              setAccountForm({ name: '', username: '', user_id: '' });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </button>
        </div>

        {/* Add/Edit Account Form */}
        {(showAddAccount || editingAccount) && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </h3>
              <button
                onClick={() => {
                  setShowAddAccount(false);
                  setEditingAccount(null);
                  setAccountForm({ name: '', username: '', user_id: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Display Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={accountForm.username}
                  onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="username (without @)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  value={accountForm.user_id}
                  onChange={(e) => setAccountForm({ ...accountForm, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234567890"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAddAccount(false);
                  setEditingAccount(null);
                  setAccountForm({ name: '', username: '', user_id: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingAccount ? handleUpdateAccount : handleAddAccount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingAccount ? 'Update' : 'Add'} Account
              </button>
            </div>
          </div>
        )}

        {/* Accounts List */}
        <div className="space-y-2">
          {accounts && accounts.length > 0 ? (
            accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-gray-900">{account.name}</div>
                  <div className="text-sm text-gray-600">
                    @{account.username} • ID: {account.user_id}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setEditingAccount(account);
                      setAccountForm({
                        name: account.name,
                        username: account.username,
                        user_id: account.user_id,
                      });
                      setShowAddAccount(false);
                    }}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No accounts added yet. Click "Add Account" to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
