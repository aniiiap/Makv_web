import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Hero = () => {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = '/images/front-view-arrangement-economy-elements.jpg';
    img.onload = () => {
      setImageLoaded(true);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden max-w-full">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 max-w-full">
        {imageLoaded ? (
          <img
            src="/images/front-view-arrangement-economy-elements.jpg"
            alt="Background"
            className="w-full h-full object-cover"
            loading="eager"
            fetchpriority="high"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-600 to-secondary-600"></div>
        )}
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/70 via-primary-800/60 to-secondary-900/70"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-full">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 px-2">
              <span className="text-white drop-shadow-lg break-words">
                Your Trusted Financial Advisor
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg sm:text-xl md:text-2xl text-white mb-4 font-medium drop-shadow-lg px-2 break-words"
          >
            Transforming Knowledge into Values
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-lg text-white/90 mb-12 max-w-3xl mx-auto drop-shadow-md px-2 break-words"
          >
            A firm of Chartered Accountants based at Ahmedabad, Mumbai & Bhilwara. Providing clients 
            with a 'One-Stop Solution' for all their business, financial and regulatory requirements. 
            Your trusted partner for business growth.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center px-2"
          >
            <Link to="/contact">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Contact Us
              </motion.button>
            </Link>
            <Link to="/services">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-primary-600 rounded-lg font-semibold text-base sm:text-lg border-2 border-primary-600 hover:bg-primary-50 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Our Services
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

