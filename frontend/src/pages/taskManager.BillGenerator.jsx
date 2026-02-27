
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTheme } from '../context/taskManager.ThemeContext';
import { FiSave, FiPlus, FiTrash2, FiArrowLeft, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const BillGenerator = () => {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [teams, setTeams] = useState([]);
    const [showExtraDetails, setShowExtraDetails] = useState(false);

    const [formData, setFormData] = useState({
        invoiceNo: `INV-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        team: '', // New field for team association

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
            gstin: '',
            stateCode: '06',
        },
        items: [
            { description: 'Professional services', hsn: '9983', amount: 0, taxRate: 18 }
        ],
        sentToEmail: '',
    });

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const response = await api.get('/teams');
                setTeams(response.data || []);
            } catch (error) {
                console.error('Error fetching teams:', error);
            }
        };
        fetchTeams();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ... (rest of handlers)

    // ... inside render:
    /* 
       Note: I will use a separate replace call for the UI part to keep chunks clean if needed, 
       but here I am replacing the top part of the component.
       Wait, I can't insert the UI in this chunk because it's further down.
       I'll just add the useEffect here.
    */


    const handleBuyerChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            buyerDetails: { ...prev.buyerDetails, [name]: value }
        }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = field === 'amount' || field === 'taxRate' ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { description: '', hsn: '9983', amount: 0, taxRate: 18 }]
        }));
    };

    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const calculateTotal = () => {
        const subtotal = formData.items.reduce((acc, item) => acc + item.amount, 0);
        const taxAmount = formData.items.reduce((acc, item) => acc + (item.amount * item.taxRate / 100), 0);
        const total = subtotal + taxAmount;

        return {
            subtotal,
            taxableAmount: subtotal,
            tax: taxAmount,
            cgst: taxAmount / 2,
            sgst: taxAmount / 2,
            total: total
        };
    };

    const numberToWords = (num) => {
        // Basic placeholder - for production a robust library like 'number-to-words' is strictly recommended
        return `Rupees ${Math.floor(num)} Only`;
    };

    const taxToWords = (num) => {
        return `INR ${Math.floor(num)} Only`;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const totals = calculateTotal();
            const payload = {
                ...formData,
                taxDetails: {
                    cgst: totals.cgst,
                    sgst: totals.sgst,
                    igst: 0,
                    totalAmount: totals.total,
                    taxableAmount: totals.taxableAmount
                },
                amountInWords: numberToWords(totals.total),
                taxAmountInWords: taxToWords(totals.tax)
            };

            await api.post('/bills', payload);
            toast.success('Bill generated and sent successfully!');
            navigate('/taskflow/bills');
        } catch (error) {
            console.error('Error generating bill:', error);
            toast.error('Failed to generate bill.');
        } finally {
            setLoading(false);
        }
    };

    const totals = calculateTotal();

    const inputClass = `w-full p-2 rounded border focus:ring-2 focus:ring-primary-500 outline-none ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`;
    const labelClass = "block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70";

    return (
        <div className={`container mx-auto px-4 py-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <button
                onClick={() => navigate('/taskflow/bills')}
                className="flex items-center gap-2 mb-6 text-primary-600 hover:text-primary-700 transition-colors"
            >
                <FiArrowLeft /> Back to Bills
            </button>

            <div className={`max-w-4xl mx-auto p-6 rounded-xl shadow-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold">Generate Tax Invoice</h1>
                    <div className="text-sm opacity-70">
                        Seller: <br />
                        <span className="font-bold">M A K V & ASSOCIATES</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Bill For (Team or Personal) */}
                    <div>
                        <label className={labelClass}>Bill For</label>
                        <select
                            name="team"
                            value={formData.team}
                            onChange={handleChange}
                            className={inputClass}
                        >
                            <option value="">Personal (No Team)</option>
                            {teams.map(team => (
                                <option key={team._id} value={team._id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Select a team to share this bill with team members. Leave as "Personal" to keep it private.
                        </p>
                    </div>

                    {/* Main Info */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>Invoice No</label>
                            <input
                                type="text"
                                name="invoiceNo"
                                value={formData.invoiceNo}
                                onChange={handleChange}
                                className={inputClass}
                                required
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Invoice Date</label>
                            <input
                                type="date" // Using standard date type; if not supported or specific format desirable, text is fine
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className={inputClass}
                                required
                            />
                        </div>
                    </div>

                    <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                    {/* Buyer Details */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            Buyer Details
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className={labelClass}>Buyer Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.buyerDetails.name}
                                    onChange={handleBuyerChange}
                                    className={inputClass}
                                    required
                                    placeholder="Company or Individual Name"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelClass}>Address</label>
                                <textarea
                                    name="address"
                                    value={formData.buyerDetails.address}
                                    onChange={handleBuyerChange}
                                    rows="3"
                                    className={inputClass}
                                    required
                                    placeholder="Full Billing Address"
                                ></textarea>
                            </div>
                            <div>
                                <label className={labelClass}>GSTIN/UIN</label>
                                <input
                                    type="text"
                                    name="gstin"
                                    value={formData.buyerDetails.gstin}
                                    onChange={handleBuyerChange}
                                    className={inputClass}
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>State Code</label>
                                <input
                                    type="text"
                                    name="stateCode"
                                    value={formData.buyerDetails.stateCode}
                                    onChange={handleBuyerChange}
                                    className={inputClass}
                                    maxLength="2"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelClass}>Send Invoice To (Email)</label>
                                <input
                                    type="email"
                                    value={formData.sentToEmail}
                                    onChange={(e) => setFormData({ ...formData, sentToEmail: e.target.value })}
                                    className={inputClass}
                                    required
                                    placeholder="client@example.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Extra Details Accordion */}
                    <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <button
                            type="button"
                            onClick={() => setShowExtraDetails(!showExtraDetails)}
                            className={`w-full flex items-center justify-between p-4 font-medium transition-colors ${isDark ? 'bg-gray-750 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}
                        >
                            <span>Additional Invoice Details (Optional)</span>
                            {showExtraDetails ? <FiChevronUp /> : <FiChevronDown />}
                        </button>

                        {showExtraDetails && (
                            <div className="p-4 grid md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
                                <div>
                                    <label className={labelClass}>Delivery Note</label>
                                    <input name="deliveryNote" value={formData.deliveryNote} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Mode/Terms of Payment</label>
                                    <input name="modeOfPayment" value={formData.modeOfPayment} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Reference No. & Date</label>
                                    <input name="referenceNo" value={formData.referenceNo} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Other References</label>
                                    <input name="otherReferences" value={formData.otherReferences} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Buyer's Order No.</label>
                                    <input name="buyersOrderNo" value={formData.buyersOrderNo} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Order Date</label>
                                    <input type="date" name="buyersOrderDate" value={formData.buyersOrderDate} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Dispatch Doc No.</label>
                                    <input name="dispatchDocNo" value={formData.dispatchDocNo} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Delivery Note Date</label>
                                    <input type="date" name="deliveryNoteDate" value={formData.deliveryNoteDate} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Dispatched Through</label>
                                    <input name="dispatchedThrough" value={formData.dispatchedThrough} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Destination</label>
                                    <input name="destination" value={formData.destination} onChange={handleChange} className={inputClass} />
                                </div>
                                <div className="md:col-span-3">
                                    <label className={labelClass}>Terms of Delivery</label>
                                    <input name="termsOfDelivery" value={formData.termsOfDelivery} onChange={handleChange} className={inputClass} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Items / Particulars</h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1 text-sm bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                            >
                                <FiPlus /> Add Item
                            </button>
                        </div>

                        <div className={`overflow-hidden rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <table className="w-full text-left border-collapse">
                                <thead className={`text-xs uppercase bg-opacity-50 ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                    <tr>
                                        <th className="p-3 font-semibold">Description</th>
                                        <th className="p-3 w-24 font-semibold">HSN/SAC</th>
                                        <th className="p-3 w-24 font-semibold">Tax (%)</th>
                                        <th className="p-3 w-32 font-semibold">Amount</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                    {formData.items.map((item, index) => (
                                        <tr key={index} className={isDark ? 'bg-gray-800' : 'bg-white'}>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    className={inputClass}
                                                    required
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.hsn}
                                                    onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={item.taxRate}
                                                    onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={item.amount}
                                                    onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                                    className={inputClass}
                                                    required
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                {formData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="mt-6 flex justify-end">
                            <div className={`w-full md:w-1/2 lg:w-1/3 p-4 rounded-lg space-y-3 ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                                <div className="flex justify-between text-sm">
                                    <span>Taxable Value:</span>
                                    <span>₹{totals.taxableAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm opacity-80">
                                    <span>CGST ({totals.tax > 0 ? totals.tax / totals.taxableAmount * 50 : 0}%):</span>
                                    <span>₹{totals.cgst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm opacity-80 pb-2 border-b border-gray-300 dark:border-gray-600">
                                    <span>SGST:</span>
                                    <span>₹{totals.sgst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-xl pt-1">
                                    <span>Total Amount:</span>
                                    <span className="text-primary-600">₹{totals.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 shadow-lg disabled:opacity-50 transform hover:scale-105 transition-all font-semibold"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <FiSave className="w-5 h-5" />
                            )}
                            Generate & Send Invoice
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BillGenerator;
