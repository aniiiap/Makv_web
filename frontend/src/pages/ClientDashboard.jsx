import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../apiClient';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaMapMarkerAlt, FaFile, FaDownload, FaEye } from 'react-icons/fa';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  useEffect(() => {
    fetchClientData();
  }, []);

  useEffect(() => {
    if (clientData?._id) {
      fetchDocuments();
    }
  }, [clientData]);

  const fetchClientData = async () => {
    try {
      // Get client data for logged-in client user
      const response = await api.get('/clients/me');
      
      if (response.data.success && response.data.data) {
        setClientData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true);
      // Use the new endpoint that finds client by userId
      const response = await api.get('/documents/my-documents');
      setDocuments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      // Check if token exists before making request
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to download files');
        logout();
        return;
      }

      // Ensure we have a valid document ID
      if (!doc._id) {
        console.error('❌ Document ID is missing:', doc);
        alert('Document ID is missing. Please refresh the page and try again.');
        return;
      }

      // Clean and validate document ID
      const documentId = String(doc._id).trim();
      if (!documentId || documentId.length < 10) {
        console.error('❌ Invalid document ID format:', documentId);
        alert('Invalid document ID. Please refresh the page and try again.');
        return;
      }

      console.log('🔍 Download request - Document ID:', documentId);
      console.log('   ID type:', typeof doc._id);
      console.log('   ID length:', documentId.length);
      console.log('   Document name:', doc.originalName);
      console.log('   Token exists:', !!token);

      // Use api client which automatically handles authentication
      const response = await api.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
      });

      // Create blob URL and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.originalName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      console.error('Error response:', error.response);
      if (error.response?.status === 401) {
        alert('Authentication failed. Please login again.');
        logout();
        return;
      }
      if (error.response?.status === 403) {
        alert('You do not have permission to download this file');
        return;
      }
      if (error.response?.status === 404) {
        alert('File not found');
        return;
      }
      alert('Failed to download file. Please try again.');
    }
  };

  const handleView = async (doc) => {
    try {
      // Check if token exists before making request
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to view files');
        logout();
        return;
      }

      // Ensure we have a valid document ID
      if (!doc._id) {
        console.error('❌ Document ID is missing:', doc);
        alert('Document ID is missing. Please refresh the page and try again.');
        return;
      }

      // Clean and validate document ID
      const documentId = String(doc._id).trim();
      if (!documentId || documentId.length < 10) {
        console.error('❌ Invalid document ID format:', documentId);
        alert('Invalid document ID. Please refresh the page and try again.');
        return;
      }

      console.log('🔍 View request - Document ID:', documentId);
      console.log('   ID type:', typeof doc._id);
      console.log('   ID length:', documentId.length);
      console.log('   Document name:', doc.originalName);
      console.log('   Token exists:', !!token);

      // Use api client which automatically handles authentication via interceptor
      const response = await api.get(`/documents/${documentId}/view`, {
        responseType: 'blob',
      });

      // Get the content type from response headers, default to application/pdf
      const contentType = response.headers['content-type'] || 
                         response.headers['Content-Type'] || 
                         'application/pdf';
      
      console.log('📄 View response - Content-Type:', contentType);
      console.log('   Blob size:', response.data.size, 'bytes');

      // Create blob with correct MIME type so browser can render it
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab - browser will render PDF correctly with proper MIME type
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('View error:', error);
      console.error('Error response:', error.response);
      if (error.response?.status === 401) {
        alert('Authentication failed. Please login again.');
        logout();
        return;
      }
      if (error.response?.status === 403) {
        alert('You do not have permission to view this file');
        return;
      }
      if (error.response?.status === 404) {
        alert('File not found');
        return;
      }
      alert('Failed to view file. Please try again.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    return '📎';
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
              <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {clientData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <FaUser className="text-primary-600 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-lg font-medium text-gray-900">{clientData.name}</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-primary-100 px-3 py-1 rounded-lg mr-3">
                  <span className="text-primary-700 font-semibold text-sm">{clientData.clientId}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client ID</p>
                  <p className="text-lg font-medium text-gray-900">{clientData.clientId}</p>
                </div>
              </div>

              <div className="flex items-start">
                <FaEnvelope className="text-primary-600 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-lg font-medium text-gray-900">{clientData.email}</p>
                </div>
              </div>

              {clientData.phone && (
                <div className="flex items-start">
                  <FaPhone className="text-primary-600 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-lg font-medium text-gray-900">{clientData.phone}</p>
                  </div>
                </div>
              )}

              {clientData.companyName && (
                <div className="flex items-start">
                  <FaBuilding className="text-primary-600 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Company Name</p>
                    <p className="text-lg font-medium text-gray-900">{clientData.companyName}</p>
                  </div>
                </div>
              )}

              {clientData.address && (
                <div className="flex items-start md:col-span-2">
                  <FaMapMarkerAlt className="text-primary-600 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-lg font-medium text-gray-900">
                      {clientData.address}
                      {clientData.city && `, ${clientData.city}`}
                      {clientData.state && `, ${clientData.state}`}
                      {clientData.pincode && ` - ${clientData.pincode}`}
                    </p>
                  </div>
                </div>
              )}

              {clientData.pan && (
                <div>
                  <p className="text-sm text-gray-500">PAN</p>
                  <p className="text-lg font-medium text-gray-900">{clientData.pan}</p>
                </div>
              )}

              {clientData.gstin && (
                <div>
                  <p className="text-sm text-gray-500">GSTIN</p>
                  <p className="text-lg font-medium text-gray-900">{clientData.gstin}</p>
                </div>
              )}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                📧 Need to update your information? Please contact your administrator.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No client data found</p>
          </div>
        )}

        {/* Documents Section */}
        {clientData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto mt-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Documents</h2>
            
            {documentsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FaFile className="mx-auto text-gray-400 text-4xl mb-4" />
                <p className="text-gray-600">No documents available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="mt-1 text-3xl flex-shrink-0">{getFileIcon(doc.fileType)}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 break-words">{doc.originalName}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                            <span className="capitalize">{doc.documentType}</span>
                            <span>•</span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>•</span>
                            <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          </div>
                          {doc.description && (
                            <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:gap-1 sm:items-end">
                        <button
                          onClick={() => handleView(doc)}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors w-auto"
                          title="View Document"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors w-auto"
                          title="Download Document"
                        >
                          <FaDownload />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
