import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import ServiceCard from '../components/ServiceCard.jsx';
import api from '../apiClient';

// Bump cache key version to avoid stale cached data without International Taxation
const CACHE_KEY = 'makv_services_data_v2';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const Services = () => {
  const [services, setServices] = useState(() => {
    // Try to load from cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  });
  const [loading, setLoading] = useState(!services);
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || 'accountingAdvisory';
  const [activeCategory, setActiveCategory] = useState(categoryFromUrl);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Only fetch if not cached
    if (!services) {
      fetchServices();
    }
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
      const data = response.data.data;
      setServices(data);
      // Cache the data
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Ignore localStorage errors
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching services:', error);
      setLoading(false);
    }
  };

  // Memoize the current category services to prevent unnecessary re-renders
  const currentCategoryData = useMemo(() => {
    if (!services) return null;

    if (services[activeCategory]) {
      return services[activeCategory];
    }

    const keys = Object.keys(services);
    if (keys.length > 0) {
      return services[keys[0]];
    }

    return null;
  }, [services, activeCategory]);


  return (
    <div className="pt-20 min-h-screen bg-gray-50 overflow-x-hidden max-w-full">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20 overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 px-2">
              Our Services
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-primary-100 max-w-2xl mx-auto mb-2 px-2 break-words">
              When you get right down to it, success is all about value and trust.
            </p>
            <p className="text-xs sm:text-sm md:text-base text-primary-200 max-w-2xl mx-auto px-2 break-words">
              One Stop Solution for all your business, financial and regulatory requirements
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-12 overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
          {loading && !currentCategoryData ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading services...</p>
              </div>
            </div>
          ) : currentCategoryData ? (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 break-words">
                  {currentCategoryData.title}
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-gray-600 w-full break-words">
                  {currentCategoryData.description}
                </p>
              </motion.div>
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {currentCategoryData.services && currentCategoryData.services.map((service, index) => (
                  <ServiceCard key={service.id} service={service} index={index} />
                ))}
              </motion.div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default Services;

