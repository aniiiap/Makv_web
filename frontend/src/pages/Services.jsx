import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import ServiceCard from '../components/ServiceCard.jsx';
import { servicesData } from '../data/servicesData.js';

// Services data is imported from servicesData.js - loaded instantly at build time
const Services = () => {
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || 'accountingAdvisory';
  const [activeCategory, setActiveCategory] = useState(categoryFromUrl);

  useEffect(() => {
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

  // Get current category data from imported servicesData - instant load (bundled at build time)
  const currentCategoryData = useMemo(() => {
    if (servicesData[activeCategory]) {
      return servicesData[activeCategory];
    }

    // Fallback to first category if activeCategory not found
    const keys = Object.keys(servicesData);
    if (keys.length > 0) {
      return servicesData[keys[0]];
    }

    return null;
  }, [activeCategory]);


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
          {currentCategoryData && (
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
          )}
        </div>
      </section>
    </div>
  );
};

export default Services;

