import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import ServiceCard from '../components/ServiceCard.jsx';
import api from '../apiClient';

const Services = () => {
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || 'accountingAdvisory';
  const [activeCategory, setActiveCategory] = useState(categoryFromUrl);

  useEffect(() => {
    fetchServices();
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setActiveCategory(category);
      // Scroll to top when category changes
      window.scrollTo(0, 0);
    }
  }, [searchParams]);

  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      setServices(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching services:', error);
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Our Services
            </h1>
            <p className="text-base md:text-lg text-primary-100 max-w-2xl mx-auto mb-2">
              When you get right down to it, success is all about value and trust.
            </p>
            <p className="text-sm md:text-base text-primary-200 max-w-2xl mx-auto">
              One Stop Solution for all your business, financial and regulatory requirements
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {services && services[activeCategory] && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  {services[activeCategory].title}
                </h2>
                <p className="text-base md:text-lg text-gray-600 w-full">
                  {services[activeCategory].description}
                </p>
              </motion.div>
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {services[activeCategory].services && services[activeCategory].services.map((service, index) => (
                  <ServiceCard key={service.id} service={service} index={index} />
                ))}
              </motion.div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Services;

