
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTheme } from '../context/taskManager.ThemeContext';
import { FiSave, FiArrowLeft, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const PaySlipGenerator = () => {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);

    const getLocalDateString = () => {
        const offset = new Date().getTimezoneOffset() * 60000;
        return new Date(Date.now() - offset).toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        clientId: '',
        clientName: '',
        clientAddress: '',
        sentToEmail: '',
        paymentDate: getLocalDateString(),
        amount: '',
        paymentMethod: 'UPI',
        transactionId: '',
        description: 'Professional Services',
        remarks: '',
    });

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await api.get('/bills/clients');
                if (res?.success) {
                    setClients(res.data || []);
                } else if (Array.isArray(res)) {
                    setClients(res);
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
            }
        };
        fetchClients();
    }, []);

    const handleClientSelect = (e) => {
        const selectedId = e.target.value;
        const client = clients.find(c => c._id === selectedId);
        if (client) {
            const address = [client.address, client.city, client.state, client.pincode].filter(Boolean).join(', ');
            setFormData(prev => ({
                ...prev,
                clientId: client._id,
                clientName: client.name,
                clientAddress: address,
                sentToEmail: client.email || '',
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                clientId: '',
                clientName: '',
                clientAddress: '',
                sentToEmail: '',
            }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.clientId) {
            toast.error('Please select a client');
            return;
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        setLoading(true);
        try {
            await api.post('/bills/payslip', {
                ...formData,
                amount: parseFloat(formData.amount),
            });
            toast.success('Pay Slip generated and sent successfully!');
            navigate(-1);
        } catch (error) {
            console.error('Error generating pay slip:', error);
            toast.error('Failed to generate pay slip.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = `w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`;
    const labelClass = "block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70";

    return (
        <div className={`max-w-3xl mx-auto p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                    <FiArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">Generate Pay Slip</h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Payment Receipt for Client</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client Selection */}
                <div className={`rounded-xl p-6 shadow-md border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h2 className="text-lg font-semibold mb-4">Client Details</h2>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Select Client</label>
                            <div className="relative">
                                <select
                                    value={formData.clientId}
                                    onChange={handleClientSelect}
                                    className={`${inputClass} appearance-none pr-10`}
                                    required
                                >
                                    <option value="">-- Select a Client --</option>
                                    {clients.map(client => (
                                        <option key={client._id} value={client._id}>{client.name}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" />
                            </div>
                        </div>
                        {formData.clientId && (
                            <>
                                <div>
                                    <label className={labelClass}>Client Name</label>
                                    <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} className={inputClass} readOnly />
                                </div>
                                <div>
                                    <label className={labelClass}>Address</label>
                                    <textarea name="clientAddress" value={formData.clientAddress} onChange={handleChange} className={`${inputClass} h-16`} />
                                </div>
                                <div>
                                    <label className={labelClass}>Email</label>
                                    <input type="email" name="sentToEmail" value={formData.sentToEmail} onChange={handleChange} className={inputClass} placeholder="client@example.com" />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Payment Details */}
                <div className={`rounded-xl p-6 shadow-md border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Payment Date</label>
                            <input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div>
                            <label className={labelClass}>Amount (₹)</label>
                            <input type="number" name="amount" value={formData.amount} onChange={handleChange}
                                className={inputClass} placeholder="0.00" min="0" step="0.01" required />
                        </div>
                        <div>
                            <label className={labelClass}>Payment Method</label>
                            <div className="relative">
                                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className={`${inputClass} appearance-none pr-10`}>
                                    <option value="UPI">UPI</option>
                                    <option value="NEFT">NEFT</option>
                                    <option value="RTGS">RTGS</option>
                                    <option value="IMPS">IMPS</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Other">Other</option>
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Transaction / Reference ID</label>
                            <input type="text" name="transactionId" value={formData.transactionId} onChange={handleChange} className={inputClass} placeholder="Optional" />
                        </div>
                        <div className="col-span-2">
                            <label className={labelClass}>Description</label>
                            <input type="text" name="description" value={formData.description} onChange={handleChange} className={inputClass} placeholder="e.g. Professional Services" />
                        </div>
                        <div className="col-span-2">
                            <label className={labelClass}>Remarks (Optional)</label>
                            <textarea name="remarks" value={formData.remarks} onChange={handleChange} className={`${inputClass} h-16`} placeholder="Any additional notes..." />
                        </div>
                    </div>
                </div>

                {/* Amount Preview */}
                {formData.amount && parseFloat(formData.amount) > 0 && (
                    <div className={`rounded-xl p-4 shadow-md border ${isDark ? 'bg-gray-900 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                        <div className="flex justify-between text-lg font-bold">
                            <span>Amount Received</span>
                            <span>₹ {parseFloat(formData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                    <FiSave className="w-5 h-5" />
                    {loading ? 'Generating...' : 'Generate & Send Pay Slip'}
                </button>
            </form>
        </div>
    );
};

export default PaySlipGenerator;
