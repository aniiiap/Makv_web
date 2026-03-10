
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTheme } from '../context/taskManager.ThemeContext';
import { FiPlus, FiDownload, FiFileText, FiExternalLink } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const PaySlipList = () => {
    const { isDark } = useTheme();
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPaySlips = async () => {
        try {
            const response = await api.get('/bills/payslips');
            if (Array.isArray(response)) {
                setPayslips(response);
            } else {
                setPayslips([]);
            }
        } catch (error) {
            console.error('Error fetching pay slips:', error);
            toast.error('Failed to load pay slips.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPaySlips();
    }, []);

    return (
        <div className={`space-y-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Pay Slips</h1>
                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        View all generated payment receipts
                    </p>
                </div>
                <Link
                    to="/taskflow/admin/payslip"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 shadow-md transform hover:scale-105 transition-all"
                >
                    <FiPlus className="w-5 h-5" />
                    <span>Generate Pay Slip</span>
                </Link>
            </div>

            <div className={`rounded-xl shadow-md border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-primary-400' : 'border-primary-600'}`}></div>
                    </div>
                ) : payslips.length === 0 ? (
                    <div className="p-12 text-center">
                        <FiFileText className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                        <h3 className="text-xl font-semibold mb-2">No Pay Slips Generated Yet</h3>
                        <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Create your first payment receipt to see it here.
                        </p>
                        <Link
                            to="/taskflow/admin/payslip"
                            className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Generate Pay Slip Now &rarr;
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className={`bg-opacity-50 ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                                <tr>
                                    <th className="p-4 font-semibold">Receipt</th>
                                    <th className="p-4 font-semibold">Client</th>
                                    <th className="p-4 font-semibold">Date</th>
                                    <th className="p-4 font-semibold">Description</th>
                                    <th className="p-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                {payslips.map((ps) => (
                                    <tr key={ps._id} className={`hover:bg-opacity-50 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                                        <td className="p-4 font-medium">{ps.originalName || ps.fileName}</td>
                                        <td className="p-4">{ps.clientId?.name || '-'}</td>
                                        <td className="p-4 text-sm">{new Date(ps.uploadedAt).toLocaleDateString()}</td>
                                        <td className="p-4 text-sm">{ps.description || '-'}</td>
                                        <td className="p-4 text-center">
                                            {ps.cloudinaryUrl ? (
                                                <div className="flex items-center justify-center gap-3">
                                                    <a
                                                        href={ps.cloudinaryUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary-600 hover:text-primary-800 transition-colors"
                                                        title="View PDF"
                                                    >
                                                        <FiExternalLink className="w-5 h-5" />
                                                    </a>
                                                    <a
                                                        href={ps.cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/')}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-gray-600 hover:text-gray-800 transition-colors"
                                                        title="Download PDF"
                                                        download
                                                    >
                                                        <FiDownload className="w-5 h-5" />
                                                    </a>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm">N/A</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaySlipList;
