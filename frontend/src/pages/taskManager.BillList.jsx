import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTheme } from '../context/taskManager.ThemeContext';
import { FiPlus, FiDownload, FiFileText, FiRefreshCw, FiSearch, FiCheck, FiX, FiSend } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

const BillList = () => {
    const { isDark } = useTheme();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'done'

    const handleExportExcel = () => {
        if (filteredBills.length === 0) {
            toast.error('No invoices to export.');
            return;
        }

        const excelData = filteredBills.map(bill => ({
            'GSTIN/UIN of Recipient': bill.buyerDetails?.gstin || 'N/A',
            'Invoice Number': bill.invoiceNo || '',
            'Invoice date': bill.date ? new Date(bill.date).toLocaleDateString('en-GB') : '',
            'Invoice Value': bill.taxDetails?.totalAmount || bill.totalAmount || 0,
            'Taxable Value': bill.taxDetails?.taxableAmount || bill.totalAmount || 0,
            'Status': bill.isDone ? 'Done' : 'Pending'
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
        XLSX.writeFile(workbook, `Invoices_${activeTab}_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const fetchBills = async () => {
        try {
            setLoading(true);
            const response = await api.get('/bills');

            if (Array.isArray(response)) {
                setBills(response);
            } else {
                setBills([]);
            }
        } catch (error) {
            console.error('Error fetching bills:', error);
            toast.error('Failed to load bills.');
        } finally {
            setLoading(false);
        }
    };

    const toggleBillStatus = async (billId, currentStatus) => {
        try {
            const loadingToast = toast.loading('Updating status...');
            const response = await api.patch(`/bills/${billId}/status`, { isDone: !currentStatus });
            if (response) {
                toast.dismiss(loadingToast);
                toast.success('Bill status updated');
                // Update local state without refetching everything
                setBills(prev => prev.map(b => b._id === billId ? { ...b, isDone: !currentStatus } : b));
            }
        } catch (error) {
            toast.dismiss();
            toast.error('Failed to update status');
            console.error(error);
        }
    };

    const sendInvoice = async (billId, invoiceNo) => {
        try {
            const toastId = toast.loading(`Sending Invoice ${invoiceNo}...`);
            await api.post(`/bills/${billId}/send`);
            toast.dismiss(toastId);
            toast.success(`Invoice ${invoiceNo} sent successfully!`);
            setBills(prev => prev.map(b => b._id === billId ? { ...b, isSent: true } : b));
        } catch (error) {
            toast.dismiss();
            toast.error(`Failed to send Invoice ${invoiceNo}`);
            console.error('Send invoice error:', error);
        }
    };

    useEffect(() => {
        fetchBills();
    }, []);

    const filteredBills = useMemo(() => {
        return bills.filter(bill => {
            // Tab filter
            if (activeTab === 'pending' && bill.isDone) return false;
            if (activeTab === 'done' && !bill.isDone) return false;

            // Search filter
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const invoiceMatch = bill.invoiceNo?.toLowerCase().includes(searchLower);
                const nameMatch = bill.buyerDetails?.name?.toLowerCase().includes(searchLower);
                return invoiceMatch || nameMatch;
            }
            return true;
        });
    }, [bills, activeTab, searchTerm]);

    const getDownloadUrl = (bill) => {
        if (!bill.pdfUrl) return '#';
        const clientFirstName = (bill.buyerDetails?.name || 'Client').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
        const safeInvoiceNo = (bill.invoiceNo || 'Unknown').replace(/[^a-zA-Z0-9-]/g, '_');
        const downloadName = `Invoice-${safeInvoiceNo}-${clientFirstName}.pdf`;
        
        // Use Cloudinary's fl_attachment feature for custom download names
        if (bill.pdfUrl.includes('/upload/')) {
            // Some Cloudinary setups throw 400 if fl_attachment value contains certain characters.
            // Replace hyphens with underscores just to be safe.
            const cloudinarySafeName = downloadName.replace(/-/g, '_');
            return bill.pdfUrl.replace('/upload/', `/upload/fl_attachment:${cloudinarySafeName}/`);
        }
        return bill.pdfUrl;
    };

    const handleDownload = async (bill) => {
        const clientFirstName = (bill.buyerDetails?.name || 'Client').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
        const safeInvoiceNo = (bill.invoiceNo || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
        const downloadName = `Invoice_${safeInvoiceNo}_${clientFirstName}.pdf`;
        
        try {
            const toastId = toast.loading('Downloading invoice...');
            const response = await fetch(bill.pdfUrl);
            if (!response.ok) throw new Error('Network error');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
            toast.dismiss(toastId);
        } catch (error) {
            toast.dismiss();
            toast.error('Failed to download PDF. Opening in new tab...');
            // Fallback: open URL
            window.open(bill.pdfUrl, '_blank');
        }
    };

    const handleView = async (bill) => {
        try {
            const toastId = toast.loading('Opening invoice...');
            const response = await fetch(bill.pdfUrl);
            if (!response.ok) throw new Error('Network error');
            const blob = await response.blob();
            // Create a blob URL with explicit application/pdf type to force inline viewing
            const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            
            // Open in new tab
            window.open(blobUrl, '_blank');
            
            toast.dismiss(toastId);
            // Clean up the URL object after a reasonable time
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
        } catch (error) {
            toast.dismiss();
            // Fallback to direct link if fetch fails (e.g., CORS issues)
            window.open(bill.pdfUrl, '_blank');
        }
    };

    return (
        <div className={`space-y-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Uploaded Bills & Invoices</h1>
                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Manage and view generated invoices
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
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

            {/* Filters & Tabs */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <div className={`flex rounded-lg p-1 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'pending'
                            ? (isDark ? 'bg-gray-700 text-white shadow' : 'bg-white text-gray-900 shadow')
                            : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
                            }`}
                    >
                        Pending Bills
                    </button>
                    <button
                        onClick={() => setActiveTab('done')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'done'
                            ? (isDark ? 'bg-gray-700 text-white shadow' : 'bg-white text-gray-900 shadow')
                            : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
                            }`}
                    >
                        Done Bills
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <input
                        type="text"
                        placeholder="Search by Invoice No or Client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none ${isDark
                            ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                            }`}
                    />
                </div>
            </div>

            {/* Content */}
            <div className={`rounded-xl shadow-md border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-primary-400' : 'border-primary-600'}`}></div>
                    </div>
                ) : filteredBills.length === 0 ? (
                    <div className="p-12 text-center">
                        <FiFileText className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                        <h3 className="text-xl font-semibold mb-2">No Bills Found</h3>
                        <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {searchTerm ? 'Try adjusting your search query.' : (activeTab === 'done' ? 'No completed bills yet.' : 'Create your first invoice to see it here.')}
                        </p>
                        {activeTab === 'pending' && !searchTerm && (
                            <Link
                                to="/taskflow/bills/create"
                                className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Generate Invoice Now &rarr;
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className={`bg-opacity-50 ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                                <tr>
                                    <th className="p-4 font-semibold">Invoice No</th>
                                    <th className="p-4 font-semibold">Date</th>
                                    <th className="p-4 font-semibold">Client Name</th>
                                    <th className="p-4 font-semibold text-right">Amount</th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                    <th className="p-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                {filteredBills.map((bill) => (
                                    <tr key={bill._id} className={`hover:bg-opacity-50 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                                        <td className="p-4 font-medium">{bill.invoiceNo}</td>
                                        <td className="p-4 text-sm">{new Date(bill.date).toLocaleDateString()}</td>
                                        <td className="p-4">{bill.buyerDetails.name}</td>
                                        <td className="p-4 text-right font-semibold">₹{bill.taxDetails?.totalAmount ? bill.taxDetails.totalAmount.toFixed(2) : (bill.totalAmount ? bill.totalAmount.toFixed(2) : '0.00')}</td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${bill.isDone ? 'bg-blue-100 text-blue-800' : (bill.isSent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}`}>
                                                {bill.isDone ? 'Done' : (bill.isSent ? 'Sent' : 'Generated')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => toggleBillStatus(bill._id, bill.isDone)}
                                                    className={`px-3 py-1 text-xs rounded-md border flex items-center gap-1 transition-colors ${
                                                        bill.isDone 
                                                        ? (isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50')
                                                        : 'border-green-500 text-green-600 hover:bg-green-50'
                                                    }`}
                                                    title={bill.isDone ? "Mark as Pending" : "Mark as Done"}
                                                >
                                                    {bill.isDone ? <><FiX className="w-3 h-3"/> Undo</> : <><FiCheck className="w-3 h-3"/> Done</>}
                                                </button>
                                                {!bill.isSent && (
                                                    <button
                                                        onClick={() => sendInvoice(bill._id, bill.invoiceNo)}
                                                        className="px-3 py-1 text-xs rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-colors"
                                                        title="Send Invoice to Client"
                                                    >
                                                        <FiSend className="w-3 h-3"/> Send
                                                    </button>
                                                )}
                                                {bill.pdfUrl ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleView(bill)}
                                                            className="text-primary-600 hover:text-primary-800 transition-colors"
                                                            title="View PDF"
                                                        >
                                                            <FiFileText className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(bill)}
                                                            className="text-gray-600 hover:text-gray-800 transition-colors"
                                                            title="Download PDF"
                                                        >
                                                            <FiDownload className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">Processing...</span>
                                                )}
                                            </div>
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
