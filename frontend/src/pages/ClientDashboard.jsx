import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../apiClient';
import { FaSignOutAlt, FaUser, FaEnvelope, FaPhone, FaBuilding, FaMapMarkerAlt } from 'react-icons/fa';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      // Find client by user email
      const response = await api.get('/clients', {
        params: { search: user?.email, limit: 1 },
      });
      
      if (response.data.data && response.data.data.length > 0) {
        setClientData(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
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
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FaSignOutAlt className="mr-2" />
              Logout
            </button>
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
      </div>
    </div>
  );
};

export default ClientDashboard;
