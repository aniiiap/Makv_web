import { useState, useEffect, useRef } from 'react';
import { FiPrinter, FiExternalLink, FiX, FiFileText } from 'react-icons/fi';
import api from '../utils/taskManager.api';
import { useTheme } from '../context/taskManager.ThemeContext';

const ChallanPreviewModal = ({ isOpen, onClose, task }) => {
  const { isDark } = useTheme();
  const [bill, setBill] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const iframeRef = useRef(null);

  useEffect(() => {
    let active = true;
    let createdBlobUrl = '';

    const loadChallan = async () => {
      if (!isOpen || !task?._id) return;
      setLoading(true);
      setError('');
      setBill(null);
      setPdfBlobUrl('');

      try {
        const res = await api.get(`/tasks/${task._id}/bill`);
        const billData = res?.data;
        if (!active) return;

        if (!billData) {
          setError('No challan found for this task.');
          return;
        }
        setBill(billData);

        if (billData.pdfUrl) {
          try {
            const pdfRes = await fetch(billData.pdfUrl);
            if (!pdfRes.ok) throw new Error('Failed to fetch PDF');
            const blob = await pdfRes.blob();
            if (!active) return;
            createdBlobUrl = window.URL.createObjectURL(
              new Blob([blob], { type: 'application/pdf' })
            );
            setPdfBlobUrl(createdBlobUrl);
          } catch (pdfErr) {
            console.warn('Could not load PDF blob for inline preview:', pdfErr);
          }
        }
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || err.message || 'Failed to load challan preview.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadChallan();

    return () => {
      active = false;
      if (createdBlobUrl) {
        window.URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [isOpen, task?._id]);

  if (!isOpen || !task) return null;

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else if (bill?.pdfUrl) {
      window.open(bill.pdfUrl, '_blank');
    }
  };

  const handleOpenNewTab = () => {
    const targetUrl = pdfBlobUrl || bill?.pdfUrl;
    if (targetUrl) {
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b ${
            isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-primary-900/40 text-primary-400' : 'bg-primary-100 text-primary-700'}`}>
              <FiFileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold truncate">
                Challan Preview {bill?.invoiceNo ? `— ${bill.invoiceNo}` : ''}
              </h3>
              <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {task.title}
                {task.client ? ` • ${task.client.name || task.client.companyName}` : ''}
                {bill?.taxDetails?.totalAmount !== undefined ? ` • ₹${bill.taxDetails.totalAmount}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(pdfBlobUrl || bill?.pdfUrl) && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                  title="Print Challan"
                >
                  <FiPrinter className="w-4 h-4" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    isDark
                      ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Open in new tab"
                >
                  <FiExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Open Tab</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
              }`}
              title="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading challan preview...</p>
            </div>
          ) : error ? (
            <div className="text-center p-6 max-w-md">
              <p className="text-sm text-red-500 font-medium mb-2">{error}</p>
            </div>
          ) : pdfBlobUrl ? (
            <iframe
              ref={iframeRef}
              src={pdfBlobUrl}
              title={`Challan ${bill?.invoiceNo || ''}`}
              className="w-full h-full border-0"
            />
          ) : bill?.pdfUrl ? (
            <div className="text-center p-6 space-y-3">
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Inline preview could not be embedded. Click below to open the challan PDF.
              </p>
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
              >
                <FiExternalLink className="w-4 h-4" />
                Open Challan PDF
              </button>
            </div>
          ) : bill ? (
            <div className={`w-full max-w-lg m-6 p-6 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h4 className="font-bold text-base mb-3">Challan Summary</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">Challan No:</span> {bill.invoiceNo}</div>
                <div><span className="font-semibold">Date:</span> {new Date(bill.date).toLocaleDateString()}</div>
                <div><span className="font-semibold">Client:</span> {bill.buyerDetails?.name || 'N/A'}</div>
                <div><span className="font-semibold">Amount:</span> ₹{bill.taxDetails?.totalAmount ?? 0}</div>
                {bill.items?.length > 0 && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-semibold block mb-1">Particulars:</span>
                    {bill.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1">
                        <span>{item.description}</span>
                        <span>₹{item.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ChallanPreviewModal;
