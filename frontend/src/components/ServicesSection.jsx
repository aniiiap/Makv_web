import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCalculator, FaShieldAlt, FaFileInvoiceDollar, FaReceipt, FaChartLine, FaUsers, FaHandHoldingUsd, FaBriefcase, FaGlobe } from 'react-icons/fa';

const ServicesSection = () => {
  const serviceCategories = [
    {
      title: 'International Taxation',
      description: 'Expert guidance on cross-border taxation, transfer pricing, DTAA, and global tax compliance',
      icon: FaGlobe,
      color: 'from-cyan-500 to-cyan-600',
      link: '/services?category=directTaxes',
    },
    {
      title: 'CFO Services',
      description: 'Virtual CFO and financial advisory services including strategic planning, budgeting, and financial analysis',
      icon: FaChartLine,
      color: 'from-teal-500 to-teal-600',
      link: '/services?category=accountingAdvisory',
    },
    {
      title: 'Accounting Advisory',
      description: 'Tailored accounting solutions for complex business needs including IND AS, IFRS, and GAAP compliance',
      icon: FaCalculator,
      color: 'from-blue-500 to-blue-600',
      link: '/services?category=accountingAdvisory',
    },
    {
      title: 'Audit & Assurance',
      description: 'Comprehensive audit services including statutory, internal, SOX compliance, and risk management',
      icon: FaShieldAlt,
      color: 'from-purple-500 to-purple-600',
      link: '/services?category=auditAssurance',
    },
    {
      title: 'Direct Taxes',
      description: 'Complete direct tax consultancy including planning, compliance, M&A advisory, and tax defense',
      icon: FaFileInvoiceDollar,
      color: 'from-green-500 to-green-600',
      link: '/services?category=directTaxes',
    },
    {
      title: 'Indirect Taxes',
      description: 'GST advisory, compliance, refund claims, and import-export procedures assistance',
      icon: FaReceipt,
      color: 'from-orange-500 to-orange-600',
      link: '/services?category=indirectTaxes',
    },
    {
      title: 'Financial Planning & Analysis',
      description: 'Strategic financial planning, budgeting, forecasting, and virtual CFO services',
      icon: FaChartLine,
      color: 'from-teal-500 to-teal-600',
      link: '/services#financial-planning',
    },
    {
      title: 'Business Process Outsourcing',
      description: 'Complete outsourcing of accounts payable, receivable, payroll, and cloud-based accounting',
      icon: FaUsers,
      color: 'from-pink-500 to-pink-600',
      link: '/services#business-process-outsourcing',
    },
    {
      title: 'Loan & Project Financing',
      description: 'Project reports, bank liaisoning, government scheme loans, and loan restructuring',
      icon: FaHandHoldingUsd,
      color: 'from-indigo-500 to-indigo-600',
      link: '/services#loan-project-financing',
    },
    {
      title: 'Other Services',
      description: 'Company incorporation, ROC compliances, trademark registration, FEMA advisory, and valuations',
      icon: FaBriefcase,
      color: 'from-red-500 to-red-600',
      link: '/services#other-services',
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 px-2 break-words">
            Our <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Services</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-2 px-2 break-words">
            When you get right down to it, success is all about value and trust.
          </p>
          <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto px-2 break-words">
            One Stop Solution for all your business, financial and regulatory requirements
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceCategories.slice(0, 6).map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group"
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <category.icon className="text-3xl" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors break-words">
                  {category.title}
                </h3>
                <p className="text-gray-600 mb-6 text-xs sm:text-sm flex-grow break-words">
                  {category.description}
                </p>
                <Link 
                  to={category.link} 
                  className="inline-block"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`py-1.5 px-4 bg-gradient-to-r ${category.color} text-white rounded-lg font-medium text-sm hover:shadow-lg transition-all duration-300`}
                  >
                    Learn More
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link 
            to="/services"
            onClick={() => window.scrollTo(0, 0)}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-semibold text-base hover:bg-primary-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              View All Services
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;

