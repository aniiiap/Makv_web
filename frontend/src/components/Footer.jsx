import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Our Services',
      links: [
        { name: 'Accounting Advisory', path: '/services?category=accountingAdvisory' },
        { name: 'Audit & Assurance', path: '/services?category=auditAssurance' },
        { name: 'Direct Taxes', path: '/services?category=directTaxes' },
        { name: 'Indirect Taxes', path: '/services?category=indirectTaxes' },
        { name: 'Financial Planning & Analysis', path: '/services?category=financialPlanning' },
        { name: 'Business Process Outsourcing', path: '/services?category=businessProcessOutsourcing' },
        { name: 'Loan & Project Financing', path: '/services?category=loanProjectFinancing' },
      ],
    },
    {
      title: 'Key Services',
      links: [
        { name: 'Virtual CFO Services', path: '/services?category=accountingAdvisory' },
        { name: 'International Taxation', path: '/services?category=directTaxes' },
        { name: 'Monthly P&L', path: '/services?category=financialPlanning' },
        { name: 'Cloud CFO', path: '/services?category=accountingAdvisory' },
        { name: 'Tax Planning', path: '/services?category=directTaxes' },
        { name: 'GST Compliance', path: '/services?category=indirectTaxes' },
        { name: 'Internal Audit', path: '/services?category=auditAssurance' },
        { name: 'Due Diligence', path: '/services?category=auditAssurance' },
        { name: 'Company Incorporation', path: '/services?category=otherServices' },
        { name: 'ROC Compliances', path: '/services?category=otherServices' },
      ],
    },
    {
      title: 'Quick Links',
      links: [
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/services' },
        { name: 'About', path: '/about' },
        { name: 'Contact', path: '/contact' },
      ],
    },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
          {/* Company Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-4 pr-8 md:pr-12 lg:pr-16"
          >
            <h3 className="text-2xl font-bold text-white mb-4 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
              CA M A K V & Associates
            </h3>
            <p className="text-sm mb-4">
              Transforming Knowledge into Values
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-white mb-2">Ahmedabad</p>
                <p className="flex items-start space-x-2 mb-1">
                  <FaMapMarkerAlt className="text-primary-400 flex-shrink-0 mt-1" />
                  <span>304, Abhijit 3 Above Pantaloons Mithakhali, Navrangpura, Ahmedabad - 380009</span>
                </p>
                <p className="flex items-center space-x-2">
                  <FaPhone className="text-primary-400 flex-shrink-0" />
                  <a href="tel:+919601743735" className="hover:text-primary-400 transition-colors">
                    +91 96017 43735
                  </a>
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">Mumbai</p>
                <p className="flex items-start space-x-2 mb-1">
                  <FaMapMarkerAlt className="text-primary-400 flex-shrink-0 mt-1" />
                  <span>1006, The Corporate Park, Sector 18, Vashi, Navi Mumbai, Mumbai - 400703</span>
                </p>
                <p className="flex items-center space-x-2">
                  <FaPhone className="text-primary-400 flex-shrink-0" />
                  <a href="tel:+917208460096" className="hover:text-primary-400 transition-colors">
                    +91 7208460096
                  </a>
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">Bhilwara</p>
                <p className="flex items-start space-x-2 mb-1">
                  <FaMapMarkerAlt className="text-primary-400 flex-shrink-0 mt-1" />
                  <span>Office No 4&5, Second Floor, NTC, Bhilwara, Rajasthan - 311001</span>
                </p>
                <p className="flex items-center space-x-2">
                  <FaPhone className="text-primary-400 flex-shrink-0" />
                  <a href="tel:+919950987445" className="hover:text-primary-400 transition-colors">
                    +91 9950987445
                  </a>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Footer Sections */}
          {footerSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={index === 0 ? 'pl-0 lg:col-span-3' : index === 1 ? 'pl-4 md:pl-6 lg:pl-6 lg:col-span-3' : 'pl-4 md:pl-6 lg:pl-6 lg:col-span-2'}
            >
              <h4 className="text-white font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      to={link.path}
                      onClick={() => window.scrollTo(0, 0)}
                      className="text-sm hover:text-primary-400 transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 pt-8 border-t border-gray-800 text-center text-sm"
        >
          <p>
            Copyright © {currentYear} M A K V Chartered Accountants & Associates. All Rights Reserved
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;

