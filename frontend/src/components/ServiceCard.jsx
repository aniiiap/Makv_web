import React, { memo } from 'react';
import { motion } from 'framer-motion';

const ServiceCard = memo(({ service, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
      whileHover={{ y: -5, scale: 1.01 }}
      className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-200 group"
    >
      {service.icon && (
        <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200 flex justify-center text-primary-600">
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
});

ServiceCard.displayName = 'ServiceCard';

export default ServiceCard;

