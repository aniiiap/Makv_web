import React from 'react';
import { motion } from 'framer-motion';

const ServiceCard = ({ service, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -10, scale: 1.02 }}
      className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group"
    >
      {service.icon && (
        <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300 flex justify-center text-primary-600">
          {typeof service.icon === 'string' ? (
            <span>{service.icon}</span>
          ) : (
            <service.icon />
          )}
        </div>
      )}
      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
        {service.title}
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">
        {service.description}
      </p>
    </motion.div>
  );
};

export default ServiceCard;

