import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../apiClient';
import toast from 'react-hot-toast';
import { FaUsers, FaUpload, FaSearch, FaPlus, FaFileExcel, FaDownload, FaEdit, FaTrash, FaFileUpload, FaFile, FaEye } from 'react-icons/fa';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedClientForDocuments, setSelectedClientForDocuments] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showExtractedDataModal, setShowExtractedDataModal] = useState(false);
  const [extractedClients, setExtractedClients] = useState([]);
  const [savingClients, setSavingClients] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [documentType, setDocumentType] = useState('other');
  const [documentDescription, setDocumentDescription] = useState('');
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    pan: '',
    aadhar: '',
    gstin: '',
  });

  useEffect(() => {
    fetchClients();
  }, [page, searchTerm]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clients', {
        params: { page, limit: 50, search: searchTerm },
      });
      setClients(response.data.data);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || (uploadFile.length && uploadFile.length === 0)) {
      alert('Please select at least one file');
      return;
    }

    const formData = new FormData();
    
    // Handle both single file (backward compatibility) and multiple files
    if (uploadFile.length) {
      // Multiple files
      for (let i = 0; i < uploadFile.length; i++) {
        formData.append('files', uploadFile[i]);
      }
    } else {
      // Single file (backward compatibility)
      formData.append('files', uploadFile);
    }

    try {
      setUploading(true);
      setUploadResult(null);
      const response = await api.post('/clients/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadResult(response.data);
      
      // If requires review (PDF/Word files), show preview modal
      if (response.data.requiresReview && response.data.extractedData && response.data.extractedData.length > 0) {
        // Prepare clients for editing (add empty fields if missing)
        const clientsToEdit = response.data.extractedData.map((data, idx) => ({
          id: `temp-${idx}`,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          pan: data.pan || '',
          aadhar: data.aadhar || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          companyName: data.companyName || '',
          gstin: data.gstin || '',
        }));
        setExtractedClients(clientsToEdit);
        setShowUploadModal(false);
        setShowExtractedDataModal(true);
      } else {
        // For CSV/Excel, auto-save as before
        setUploadFile(null);
        setTimeout(() => {
          setShowUploadModal(false);
          fetchClients();
        }, 2000);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.response?.data?.message || 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveExtractedClients = async () => {
    try {
      setSavingClients(true);
      
      let savedCount = 0;
      let skippedCount = 0;
      
      // Save each client
      for (const client of extractedClients) {
        // Validate required fields: Name and PAN (Email is optional)
        const name = client.name ? client.name.trim() : '';
        const pan = client.pan ? client.pan.trim().replace(/[^A-Z0-9]/g, '') : '';
        
        if (!name || name.length < 3 || !pan || pan.length !== 10) {
          skippedCount++;
          console.warn(`Skipping client: Name="${name}", PAN="${pan}" (validation failed)`);
          continue; // Skip invalid clients
        }
        
        // Clean and prepare client data before sending
        // Remove temporary fields like id, _sourceFile, etc.
        const clientData = {
          name: name,
          pan: pan || '',
          email: client.email ? client.email.trim().toLowerCase() : undefined,
          phone: client.phone ? client.phone.trim().replace(/[^\d]/g, '').slice(-10) : '',
          companyName: client.companyName || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          pincode: client.pincode || '',
          aadhar: client.aadhar || '',
          gstin: client.gstin || '',
        };
        
        // Remove empty strings and convert to undefined (except required fields)
        Object.keys(clientData).forEach(key => {
          if (clientData[key] === '' && key !== 'pan' && key !== 'name') {
            delete clientData[key];
          }
        });
        
        try {
          console.log(`Attempting to save client: ${name}, PAN: ${pan}`);
          console.log('Client data:', JSON.stringify(clientData, null, 2));
          
          const response = await api.post('/clients', clientData);
          if (response.data && response.data.success) {
            // Check if client was skipped (already exists)
            if (response.data.skipped) {
              skippedCount++;
              console.log(`⏭️ Client "${name}" already exists - skipped`);
            } else {
              savedCount++;
              console.log(`✅ Successfully saved client: ${name}`);
            }
          } else {
            throw new Error(response.data?.message || 'Failed to save client');
          }
        } catch (error) {
          console.error('Error saving client:', error);
          console.error('Client data that failed:', JSON.stringify(clientData, null, 2));
          console.error('Original client object:', client);
          console.error('Error response:', error.response?.data);
          
          // Log specific error details
          const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
          console.error(`Failed to save client "${name || 'Unknown'}": ${errorMessage}`);
          
          skippedCount++;
          // Continue with next client
        }
      }
      
      // Close modal and refresh client list
      setShowExtractedDataModal(false);
      setExtractedClients([]);
      fetchClients();
      
      if (savedCount > 0) {
        toast.success(`✅ Successfully saved ${savedCount} client(s)${skippedCount > 0 ? `. ${skippedCount} client(s) skipped (missing Name or PAN)` : ''}`, {
          duration: 4000,
        });
      } else {
        toast.error('❌ No clients were saved. Please ensure Name and PAN are filled for all clients.', {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error saving clients:', error);
      toast.error(`❌ Error saving clients: ${error.message || 'Please try again.'}`, {
        duration: 4000,
      });
    } finally {
      setSavingClients(false);
    }
  };

  const handleUpdateExtractedClient = (id, field, value) => {
    setExtractedClients(clients =>
      clients.map(client =>
        client.id === id ? { ...client, [field]: value } : client
      )
    );
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      await api.post('/clients', newClient);
      setShowAddModal(false);
      setNewClient({
        name: '',
        email: '',
        phone: '',
        companyName: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        pan: '',
        aadhar: '',
        gstin: '',
      });
      fetchClients();
      toast.success('Client added successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add client');
    }
  };

  const handleEditClient = (client) => {
    setEditingClient({
      _id: client._id,
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      companyName: client.companyName || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      pincode: client.pincode || '',
      pan: client.pan || '',
      aadhar: client.aadhar || '',
      gstin: client.gstin || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    if (!editingClient?._id) return;
    
    try {
      await api.put(`/clients/${editingClient._id}`, editingClient);
      setShowEditModal(false);
      setEditingClient(null);
      fetchClients();
      toast.success('Client updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update client');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;

    try {
      await api.delete(`/clients/${id}`);
      fetchClients();
      toast.success('Client deleted successfully');
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const fetchClientDocuments = async (clientId) => {
    try {
      setDocumentsLoading(true);
      const response = await api.get(`/documents/client/${clientId}`);
      setDocuments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching client documents:', error);
      toast.error('Failed to fetch documents');
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleViewClientDocuments = (client) => {
    setSelectedClientForDocuments(client);
    setShowDocumentsModal(true);
    fetchClientDocuments(client._id);
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;
    try {
      await api.delete(`/documents/${documentId}`);
      toast.success('Document deleted successfully');
      // Refresh documents list for the current client
      if (selectedClientForDocuments) {
        fetchClientDocuments(selectedClientForDocuments._id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const documentId = String(doc._id).trim();
      if (!documentId) {
        toast.error('Invalid document ID');
        return;
      }

      const response = await api.get(`/documents/${documentId}/view`, {
        responseType: 'blob',
      });

      const contentType = response.headers['content-type'] || 
                         response.headers['Content-Type'] || 
                         'application/pdf';
      
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('View error:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please login again.');
        return;
      }
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view this file');
        return;
      }
      if (error.response?.status === 404) {
        toast.error('File not found');
        return;
      }
      toast.error('Failed to view file. Please try again.');
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const documentId = String(doc._id).trim();
      if (!documentId) {
        toast.error('Invalid document ID');
        return;
      }

      const response = await api.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
      });

      const contentType = response.headers['content-type'] || 
                         response.headers['Content-Type'] || 
                         'application/octet-stream';
      
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
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
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please login again.');
        return;
      }
      if (error.response?.status === 403) {
        toast.error('You do not have permission to download this file');
        return;
      }
      if (error.response?.status === 404) {
        toast.error('File not found');
        return;
      }
      toast.error('Failed to download file. Please try again.');
    }
  };


  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (documentFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < documentFiles.length; i++) {
      formData.append('files', documentFiles[i]);
    }
    formData.append('documentType', documentType);
    formData.append('description', documentDescription);

    // Close modal immediately for instant feel
    setShowDocumentUploadModal(false);
    const fileCount = documentFiles.length;
    const fileName = documentFiles[0]?.name || 'file';
    
    // Show loading toast immediately
    const loadingToast = toast.loading(`Uploading ${fileCount} file(s)...`);
    
    try {
      setUploadingDocuments(true);
      
      const response = await api.post(`/documents/${selectedClient._id}`, formData, {
        headers: {
          // Don't set Content-Type - let axios set it automatically with boundary
        },
        timeout: 120000, // 2 minutes timeout
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Update toast with progress
            toast.loading(`Uploading... ${percentCompleted}%`, { id: loadingToast });
          }
        },
      });
      
      if (response.data && response.data.success) {
        // Dismiss loading toast and show success
        toast.dismiss(loadingToast);
        toast.success(`✅ ${fileCount} file(s) uploaded successfully!`, {
          duration: 3000,
        });
        
        // Reset state
        setUploadingDocuments(false);
        setDocumentFiles([]);
        setDocumentType('other');
        setDocumentDescription('');
        setSelectedClient(null);
        
        // Refresh client list
        fetchClients();
      } else {
        throw new Error(response.data?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      
      // Get error message
      let errorMessage = 'Failed to upload documents. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(`❌ ${errorMessage}`, {
        duration: 4000,
      });
      
      // Reset state
      setUploadingDocuments(false);
      
      // Reopen modal on error so user can retry
      setShowDocumentUploadModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FaUpload className="mr-2" />
            Bulk Upload (Multiple Files)
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaPlus className="mr-2" />
            Add Client
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients by name, email, client ID, or company..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Clients Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FaUsers className="mx-auto text-gray-400 text-5xl mb-4" />
            <p className="text-gray-600">No clients found</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PAN
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aadhaar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map((client) => (
                      <tr key={client._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {client.clientId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {client.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.pan || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.aadhar || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedClient(client);
                                setShowDocumentUploadModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Upload Documents"
                            >
                              <FaFileUpload />
                            </button>
                            <button
                              onClick={() => handleViewClientDocuments(client)}
                              className="text-purple-600 hover:text-purple-900"
                              title="View Documents"
                            >
                              <FaEye />
                            </button>
                            <button
                              onClick={() => handleEditClient(client)}
                              className="text-green-600 hover:text-green-900"
                              title="Edit Client"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDelete(client._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Client"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-xl font-bold mb-4">Bulk Upload Clients</h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload multiple CSV, Excel, PDF, or Word (.docx) files with client data. The system will extract: PAN, Name, Address, Aadhaar, Email, Mobile, and other fields.
            </p>
            <p className="text-xs text-blue-600 mb-4">
              <strong>CSV/Excel:</strong> Required: Name. Optional: Email, Phone, Company, Address, City, State, Pincode, PAN, Aadhaar, GSTIN<br/>
              <strong>PDF/Word:</strong> Each file = one client. System extracts data automatically (Name and PAN are required).
            </p>
            <form onSubmit={handleFileUpload}>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.docx"
                multiple
                onChange={(e) => setUploadFile(e.target.files)}
                className="mb-4 w-full"
                required
              />
              <p className="text-xs text-gray-500 mb-4">
                You can select multiple files. For PDF/Word: Each file = one client. For CSV/Excel: Multiple rows = multiple clients.
              </p>
              {uploadResult && (
                <div
                  className={`mb-4 p-3 rounded-lg ${
                    uploadResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {uploadResult.success ? (
                    <div>
                      <p>✅ Upload successful!</p>
                      <p className="text-sm mt-1">
                        Successfully imported: {uploadResult.summary?.successful || 0} clients
                        {uploadResult.summary?.duplicates > 0 &&
                          `, ${uploadResult.summary.duplicates} duplicates skipped`}
                      </p>
                      {uploadResult.extractedData && uploadResult.extractedData.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="font-semibold text-sm mb-2">Extracted Data:</p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {uploadResult.extractedData.map((data, idx) => (
                              <div key={idx} className="text-xs bg-white p-2 rounded border">
                                <div className="grid grid-cols-2 gap-1">
                                  {data.name && <div><strong>Name:</strong> {data.name}</div>}
                                  {data.email && <div><strong>Email:</strong> {data.email}</div>}
                                  {data.phone && <div><strong>Mobile:</strong> {data.phone}</div>}
                                  {data.pan && <div><strong>PAN:</strong> {data.pan}</div>}
                                  {data.aadhar && <div><strong>Aadhaar:</strong> {data.aadhar}</div>}
                                  {data.address && <div className="col-span-2"><strong>Address:</strong> {data.address}</div>}
                                  {data.companyName && <div className="col-span-2"><strong>Company:</strong> {data.companyName}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{uploadResult.message}</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploading || (!uploadFile || (uploadFile.length && uploadFile.length === 0))}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadResult(null);
                  }}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Extracted Data Preview/Edit Modal */}
      {showExtractedDataModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold mb-4">Review and Edit Extracted Data</h2>
            <p className="text-sm text-gray-600 mb-4">
              Review the extracted data from your files. You can edit any field before saving. Make sure Name and PAN are filled (Email is optional).
            </p>
            
            <div className="space-y-4 mb-4">
              {extractedClients.map((client, idx) => (
                <div key={client.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Client {idx + 1}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={client.name}
                        onChange={(e) => handleUpdateExtractedClient(client.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={client.email}
                        onChange={(e) => handleUpdateExtractedClient(client.id, 'email', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                      <input
                        type="text"
                        value={client.phone}
                        onChange={(e) => handleUpdateExtractedClient(client.id, 'phone', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="10 digits"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PAN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={client.pan}
                        onChange={(e) => handleUpdateExtractedClient(client.id, 'pan', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar</label>
                      <input
                        type="text"
                        value={client.aadhar}
                        onChange={(e) => handleUpdateExtractedClient(client.id, 'aadhar', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="12 digits"
                        maxLength={12}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={client.companyName}
                        onChange={(e) => handleUpdateExtractedClient(client.id, 'companyName', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={client.address}
                        onChange={(e) => handleUpdateExtractedClient(client.id, 'address', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={client.city}
                        onChange={(e) => handleUpdateExtractedClient(client.id, 'city', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={client.state}
                        onChange={(e) => handleUpdateExtractedClient(client.id, 'state', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        value={client.pincode}
                        onChange={(e) => handleUpdateExtractedClient(client.id, 'pincode', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="6 digits"
                        maxLength={6}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                      <input
                        type="text"
                        value={client.gstin}
                        onChange={(e) => handleUpdateExtractedClient(client.id, 'gstin', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowExtractedDataModal(false);
                  setExtractedClients([]);
                }}
                className="px-4 py-2 border rounded-lg"
                disabled={savingClients}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExtractedClients}
                disabled={savingClients}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {savingClients ? 'Saving...' : `Save ${extractedClients.length} Client(s)`}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold mb-4">Add New Client</h2>
            <form onSubmit={handleAddClient} className="space-y-4">
              <input
                type="text"
                placeholder="Name *"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
              <input
                type="email"
                placeholder="Email *"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
              <input
                type="text"
                placeholder="Phone"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Company Name"
                value={newClient.companyName}
                onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Address"
                value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="City"
                  value={newClient.city}
                  onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={newClient.state}
                  onChange={(e) => setNewClient({ ...newClient, state: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Pincode"
                  value={newClient.pincode}
                  onChange={(e) => setNewClient({ ...newClient, pincode: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                placeholder="PAN"
                value={newClient.pan}
                onChange={(e) => setNewClient({ ...newClient, pan: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
                <input
                  type="text"
                  placeholder="Aadhaar"
                  value={newClient.aadhar}
                  onChange={(e) => setNewClient({ ...newClient, aadhar: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <input
                type="text"
                placeholder="GSTIN"
                value={newClient.gstin}
                onChange={(e) => setNewClient({ ...newClient, gstin: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Client
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold mb-4">Edit Client</h2>
            <form onSubmit={handleUpdateClient} className="space-y-4">
              <input
                type="text"
                placeholder="Name *"
                value={editingClient.name}
                onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={editingClient.email}
                onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Phone"
                value={editingClient.phone}
                onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Company Name"
                value={editingClient.companyName}
                onChange={(e) => setEditingClient({ ...editingClient, companyName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Address"
                value={editingClient.address}
                onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="City"
                  value={editingClient.city}
                  onChange={(e) => setEditingClient({ ...editingClient, city: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={editingClient.state}
                  onChange={(e) => setEditingClient({ ...editingClient, state: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Pincode"
                  value={editingClient.pincode}
                  onChange={(e) => setEditingClient({ ...editingClient, pincode: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="PAN"
                  value={editingClient.pan}
                  onChange={(e) => setEditingClient({ ...editingClient, pan: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Aadhaar"
                  value={editingClient.aadhar}
                  onChange={(e) => setEditingClient({ ...editingClient, aadhar: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <input
                type="text"
                placeholder="GSTIN"
                value={editingClient.gstin}
                onChange={(e) => setEditingClient({ ...editingClient, gstin: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Client
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClient(null);
                  }}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocumentUploadModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-xl font-bold mb-4">Upload Documents for {selectedClient.name}</h2>
            <form onSubmit={handleDocumentUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="other">Other</option>
                  <option value="payslip">Payslip</option>
                  <option value="acknowledgment">Acknowledgment</option>
                  <option value="certificate">Certificate</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows="3"
                  placeholder="Add description..."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Files (PDF, Word, Excel) - Multiple files allowed
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.xls"
                  multiple
                  onChange={(e) => setDocumentFiles(Array.from(e.target.files))}
                  className="w-full"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploadingDocuments || documentFiles.length === 0}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {uploadingDocuments ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDocumentUploadModal(false);
                    setDocumentFiles([]);
                    setDocumentType('other');
                    setDocumentDescription('');
                    setSelectedClient(null);
                  }}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* View Client Documents Modal */}
      {showDocumentsModal && selectedClientForDocuments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Documents for {selectedClientForDocuments.name}
              </h2>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedClientForDocuments(null);
                  setDocuments([]);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {documentsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FaFile className="mx-auto text-gray-400 text-5xl mb-4" />
                <p className="text-gray-600">No documents found for this client</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Uploaded
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documents.map((doc) => (
                      <tr key={doc._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={doc.originalName}>
                            {doc.originalName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="capitalize">{doc.documentType || 'other'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDocument(doc)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Document"
                            >
                              <FaEye />
                            </button>
                            <button
                              onClick={() => handleDownloadDocument(doc)}
                              className="text-green-600 hover:text-green-900"
                              title="Download Document"
                            >
                              <FaDownload />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Document"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedClientForDocuments(null);
                  setDocuments([]);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
