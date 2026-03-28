
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTheme } from '../context/taskManager.ThemeContext';
import { FiPlus, FiDownload, FiFileText, FiRefreshCw } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

const BillList = () => {
    const { isDark } = useTheme();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleExportExcel = () => {
        if (bills.length === 0) {
            toast.error('No invoices to export.');
            return;
        }

        const excelData = bills.map(bill => ({
            'GSTIN/UIN of Recipient': bill.buyerDetails?.gstin || 'N/A',
            'Invoice Number': bill.invoiceNo || '',
            'Invoice date': bill.date ? new Date(bill.date).toLocaleDateString('en-GB') : '',
            'Invoice Value': bill.taxDetails?.totalAmount || bill.totalAmount || 0,
            'Taxable Value': bill.taxDetails?.taxableAmount || bill.totalAmount || 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
        XLSX.writeFile(workbook, `Invoices_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const fetchBills = async () => {
        try {
            console.log('Client: Fetching bills...');
            const response = await api.get('/bills');
            console.log('Client: Bills API Response:', response);

            // The interceptor already returns 'response.data', so 'response' IS the data array
            if (Array.isArray(response)) {
                console.log('Client: Setting bills state with length:', response.length);
                setBills(response);
            } else {
                console.error('Client: Response is not an array:', response);
                setBills([]);
            }
        } catch (error) {
            console.error('Error fetching bills:', error);
            toast.error('Failed to load bills.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, []);

    return (
        <div className={`space-y-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Uploaded Bills</h1>
                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Manage and view generated invoices
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportExcel}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-md font-medium ${isDark
                            ? 'bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        title="Export to Excel"
                    >
                        <FiDownload className="w-5 h-5" />
                        <span className="hidden sm:inline">Export to Excel</span>
                        <span className="sm:hidden">Export</span>
                    </button>
                    <Link
                        to="/taskflow/bills/create"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 shadow-md transform hover:scale-105 transition-all"
                    >
                        <FiPlus className="w-5 h-5" />
                        <span>Generate New Bill</span>
                    </Link>
                    <Link
                        to="/taskflow/bills/create-huf"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 shadow-md transform hover:scale-105 transition-all"
                    >
                        <FiPlus className="w-5 h-5" />
                        <span>Generate HUF Bill</span>
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className={`rounded-xl shadow-md border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-primary-400' : 'border-primary-600'}`}></div>
                    </div>
                ) : bills.length === 0 ? (
                    <div className="p-12 text-center">
                        <FiFileText className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                        <h3 className="text-xl font-semibold mb-2">No Bills Generated Yet</h3>
                        <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Create your first invoice to see it here.
                        </p>
                        <Link
                            to="/taskflow/bills/create"
                            className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Generate Invoice Now &rarr;
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className={`bg-opacity-50 ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                                <tr>
                                    <th className="p-4 font-semibold">Invoice No</th>
                                    <th className="p-4 font-semibold">Date</th>
                                    <th className="p-4 font-semibold">Sender</th>
                                    <th className="p-4 font-semibold text-right">Amount</th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                    <th className="p-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                {bills.map((bill) => (
                                    <tr key={bill._id} className={`hover:bg-opacity-50 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                                        <td className="p-4 font-medium">{bill.invoiceNo}</td>
                                        <td className="p-4 text-sm">{new Date(bill.date).toLocaleDateString()}</td>
                                        <td className="p-4">{bill.buyerDetails.name}</td>
                                        <td className="p-4 text-right font-semibold">₹{bill.taxDetails?.totalAmount ? bill.taxDetails.totalAmount.toFixed(2) : '0.00'}</td>
                                        <td className="p-4 text-center">
                                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                                Sent
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {bill.pdfUrl ? (
                                                <div className="flex items-center justify-center gap-3">
                                                    <a
                                                        href={bill.pdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary-600 hover:text-primary-800 transition-colors"
                                                        title="View PDF"
                                                    >
                                                        <FiFileText className="w-5 h-5" />
                                                    </a>
                                                    <a
                                                        href={bill.pdfUrl.replace('/upload/', '/upload/fl_attachment/')}
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
                                                <span className="text-gray-400 text-sm">Processing...</span>
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

export default BillList;
