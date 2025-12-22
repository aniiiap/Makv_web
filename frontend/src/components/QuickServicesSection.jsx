import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCalculator, FaShieldAlt, FaFileInvoiceDollar, FaReceipt, FaChartLine, FaUsers, FaHandHoldingUsd, FaBriefcase, FaGlobe, FaFileAlt, FaCloud } from 'react-icons/fa';

const QuickServicesSection = () => {
  const quickServices = [
    { name: 'International Taxation', path: '/services?category=directTaxes', icon: FaGlobe },
    { name: 'Cloud CFO', path: '/services?category=accountingAdvisory', icon: FaCloud },
    { name: 'Statutory Audit', path: '/services?category=auditAssurance', icon: FaShieldAlt },
    { name: 'GST Audit', path: '/services?category=indirectTaxes', icon: FaReceipt },
    { name: 'GST Filing', path: '/services?category=indirectTaxes', icon: FaReceipt },
    { name: 'Tax Audit', path: '/services?category=directTaxes', icon: FaFileInvoiceDollar },
    { name: 'CFO Services', path: '/services?category=accountingAdvisory', icon: FaChartLine },
    { name: 'Monthly P&L', path: '/services?category=financialPlanning', icon: FaFileAlt },
    { name: 'Tax E-filing', path: '/services?category=directTaxes', icon: FaFileInvoiceDollar },
    { name: 'Company Incorporation', path: '/services?category=otherServices', icon: FaBriefcase },
    { name: 'International Tax', path: '/services?category=internationalTaxation', icon: FaGlobe },
    { name: 'Transfer Pricing', path: '/services?category=internationalTaxation', icon: FaGlobe },
  ];

  return (
    <section className="py-20 bg-white overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-gray-900 px-2 break-words">
            Important <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Services</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-2 break-words">
            Quick access to our most popular services
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {quickServices.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <Link
                  to={service.path}
                  onClick={() => window.scrollTo(0, 0)}
                  className="block bg-gradient-to-br from-primary-50 to-secondary-50 hover:from-primary-100 hover:to-secondary-100 rounded-xl p-4 text-center transition-all duration-300 shadow-md hover:shadow-lg border border-primary-100 hover:border-primary-300"
                >
                  <div className="text-3xl mb-2 text-primary-600 flex justify-center">
                    <IconComponent />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-tight break-words px-1">
                    {service.name}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickServicesSection;

