
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTheme } from '../context/taskManager.ThemeContext';
import { FiSave, FiPlus, FiTrash2, FiArrowLeft, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const HUFBillGenerator = () => {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [showExtraDetails, setShowExtraDetails] = useState(false);

    const getLocalDateString = () => {
        const offset = new Date().getTimezoneOffset() * 60000;
        return new Date(Date.now() - offset).toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        invoiceNo: 'Auto-generated upon save',
        date: getLocalDateString(),

        // Extra Fields
        deliveryNote: '',
        modeOfPayment: '',
        referenceNo: '',
        otherReferences: '',
        buyersOrderNo: '',
        buyersOrderDate: '',
        dispatchDocNo: '',
        deliveryNoteDate: '',
        dispatchedThrough: '',
        destination: '',
        termsOfDelivery: '',

        buyerDetails: {
            name: '',
            address: '',
        },
        items: [
            { description: 'Professional Services', subDescription: '', amount: 0 }
        ],
        sentToEmail: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBuyerChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            buyerDetails: { ...prev.buyerDetails, [name]: value }
        }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { description: '', subDescription: '', amount: 0 }]
        }));
    };

    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const calculateTotal = () => {
        return formData.items.reduce((acc, item) => {
            return acc + (parseFloat(item.amount) || 0);
        }, 0);
    };

    const numberToWords = (num) => {
        return `INR ${Math.floor(num)} Only`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const total = calculateTotal();
            const payload = {
                ...formData,
                items: formData.items.map(item => ({
                    ...item,
                    amount: parseFloat(item.amount) || 0,
                })),
                totalAmount: total,
                amountInWords: numberToWords(total),
            };

            await api.post('/bills/huf', payload);
            toast.success('HUF Bill generated successfully!');
            navigate('/taskflow/bills');
        } catch (error) {
            console.error('Error generating HUF bill:', error);
            toast.error('Failed to generate HUF bill.');
        } finally {
            setLoading(false);
        }
    };

    const total = calculateTotal();

    const inputClass = `w-full p-2 rounded border focus:ring-2 focus:ring-primary-500 outline-none ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`;
    const labelClass = "block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70";

    return (
        <div className={`max-w-4xl mx-auto p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/taskflow/bills')}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                    <FiArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">Generate HUF Invoice</h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>MURLI ATAL HUF</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date */}
                <div className={`rounded-xl p-6 shadow-md border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Invoice No.</label>
                            <input type="text" value="Auto-generated" disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
                        </div>
                        <div>
                            <label className={labelClass}>Date</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} className={inputClass} />
                        </div>
                    </div>
                </div>

                {/* Extra Details (collapsible) */}
                <div className={`rounded-xl shadow-md border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <button
                        type="button"
                        onClick={() => setShowExtraDetails(!showExtraDetails)}
                        className={`w-full p-4 flex items-center justify-between text-left ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                    >
                        <span className="font-semibold">Additional Details (Optional)</span>
                        {showExtraDetails ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                    {showExtraDetails && (
                        <div className="p-6 pt-0 grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Delivery Note</label>
                                <input type="text" name="deliveryNote" value={formData.deliveryNote} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Mode of Payment</label>
                                <input type="text" name="modeOfPayment" value={formData.modeOfPayment} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Reference No.</label>
                                <input type="text" name="referenceNo" value={formData.referenceNo} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Other References</label>
                                <input type="text" name="otherReferences" value={formData.otherReferences} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Buyer's Order No.</label>
                                <input type="text" name="buyersOrderNo" value={formData.buyersOrderNo} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Buyer's Order Date</label>
                                <input type="date" name="buyersOrderDate" value={formData.buyersOrderDate} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Dispatch Doc No.</label>
                                <input type="text" name="dispatchDocNo" value={formData.dispatchDocNo} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Delivery Note Date</label>
                                <input type="date" name="deliveryNoteDate" value={formData.deliveryNoteDate} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Dispatched Through</label>
                                <input type="text" name="dispatchedThrough" value={formData.dispatchedThrough} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Destination</label>
                                <input type="text" name="destination" value={formData.destination} onChange={handleChange} className={inputClass} />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>Terms of Delivery</label>
                                <input type="text" name="termsOfDelivery" value={formData.termsOfDelivery} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Buyer Details */}
                <div className={`rounded-xl p-6 shadow-md border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h2 className="text-lg font-semibold mb-4">Buyer Details</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className={labelClass}>Buyer Name</label>
                            <input type="text" name="name" value={formData.buyerDetails.name} onChange={handleBuyerChange} className={inputClass} placeholder="e.g. NEWFABRICS PACKAGING PRIVATE LIMITED" required />
                        </div>
                        <div>
                            <label className={labelClass}>Address</label>
                            <textarea name="address" value={formData.buyerDetails.address} onChange={handleBuyerChange} className={`${inputClass} h-20`} placeholder="Full address" required />
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className={`rounded-xl p-6 shadow-md border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Particulars</h2>
                        <button type="button" onClick={addItem}
                            className="flex items-center gap-1 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                            <FiPlus className="w-4 h-4" /> Add Item
                        </button>
                    </div>
                    <div className="space-y-4">
                        {formData.items.map((item, index) => (
                            <div key={index} className={`p-4 rounded-lg border ${isDark ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-5">
                                        <label className={labelClass}>Description</label>
                                        <input type="text" value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            className={inputClass} placeholder="e.g. Professional Services" />
                                    </div>
                                    <div className="col-span-4">
                                        <label className={labelClass}>Sub-Description (optional, italic)</label>
                                        <input type="text" value={item.subDescription}
                                            onChange={(e) => handleItemChange(index, 'subDescription', e.target.value)}
                                            className={inputClass} placeholder="e.g. For Filing of 4 Applications Under RIPS" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelClass}>Amount (₹)</label>
                                        <input type="number" value={item.amount}
                                            onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                            className={inputClass} min="0" step="0.01" />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        {formData.items.length > 1 && (
                                            <button type="button" onClick={() => removeItem(index)}
                                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg">
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className={`mt-4 p-4 rounded-lg border ${isDark ? 'bg-gray-900 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total Amount</span>
                            <span>₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Email */}
                <div className={`rounded-xl p-6 shadow-md border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h2 className="text-lg font-semibold mb-4">Send Invoice</h2>
                    <div>
                        <label className={labelClass}>Recipient Email</label>
                        <input type="email" name="sentToEmail" value={formData.sentToEmail} onChange={handleChange}
                            className={inputClass} placeholder="client@example.com" />
                    </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    <FiSave className="w-5 h-5" />
                    {loading ? 'Generating...' : 'Generate HUF Invoice'}
                </button>
            </form>
        </div>
    );
};

export default HUFBillGenerator;
