import { useState } from 'react';
import { FiX, FiUserPlus, FiAlertCircle } from 'react-icons/fi';
import adminApi from '../utils/adminApi';

const BulkCreateUserModal = ({ onClose, onUsersCreated }) => {
    const [bulkText, setBulkText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleBulkCreate = async (e) => {
        e.preventDefault();

        // Parse the bulk text - expect format: "Name, email@example.com" per line
        const lines = bulkText.trim().split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            alert('Please enter at least one user');
            return;
        }

        const users = [];
        for (const line of lines) {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length >= 2) {
                users.push({
                    name: parts[0],
                    email: parts[1],
                });
            }
        }

        if (users.length === 0) {
            alert('No valid users found. Format: Name, email@example.com (one per line)');
            return;
        }

        try {
            setLoading(true);
            const response = await adminApi.createBulkUsers(users);
            setResult(response.results);

            if (response.results.success.length > 0) {
                setTimeout(() => {
                    onUsersCreated();
                }, 2000);
            }
        } catch (error) {
            console.error('Error creating users:', error);
            alert('Failed to create users');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Bulk Create Users</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <FiX className="w-6 h-6" />
                        </button>
                    </div>

                    {!result ? (
                        <form onSubmit={handleBulkCreate}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    User List
                                </label>
                                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>Format:</strong> Name, email@example.com (one per line)
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        Example:<br />
                                        John Doe, john@example.com<br />
                                        Jane Smith, jane@example.com
                                    </p>
                                </div>
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder="John Doe, john@example.com&#10;Jane Smith, jane@example.com"
                                    rows={10}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                                    required
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <FiUserPlus className="w-5 h-5" />
                                            Create Users
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex-1">
                                        <p className="text-lg font-semibold text-green-600">
                                            ✅ {result.success.length} users created successfully
                                        </p>
                                        {result.failed.length > 0 && (
                                            <p className="text-sm text-red-600">
                                                ❌ {result.failed.length} failed
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {result.success.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="font-medium text-gray-900 mb-2">Created Users:</h3>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                                            {result.success.map((user, index) => (
                                                <div key={index} className="text-sm text-green-800">
                                                    ✓ {user.name} ({user.email})
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.failed.length > 0 && (
                                    <div>
                                        <h3 className="font-medium text-gray-900 mb-2">Failed:</h3>
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                                            {result.failed.map((fail, index) => (
                                                <div key={index} className="text-sm text-red-800">
                                                    ✗ {fail.email}: {fail.reason}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkCreateUserModal;
