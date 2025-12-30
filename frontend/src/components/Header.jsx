import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalculator, FaShieldAlt, FaFileInvoiceDollar, FaReceipt, FaChartLine, FaUsers, FaHandHoldingUsd, FaBriefcase, FaChevronDown, FaSignInAlt, FaUserShield } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const { user, logout, isMaster, isClient } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsServicesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const serviceCategories = [
    { key: 'accountingAdvisory', name: 'Accounting Advisory', icon: FaCalculator, path: '/services?category=accountingAdvisory' },
    { key: 'auditAssurance', name: 'Audit & Assurance', icon: FaShieldAlt, path: '/services?category=auditAssurance' },
    { key: 'directTaxes', name: 'Direct Taxes', icon: FaFileInvoiceDollar, path: '/services?category=directTaxes' },
    { key: 'indirectTaxes', name: 'Indirect Taxes', icon: FaReceipt, path: '/services?category=indirectTaxes' },
    { key: 'financialPlanning', name: 'Financial Planning', icon: FaChartLine, path: '/services?category=financialPlanning' },
    { key: 'internationalTaxation', name: 'International Taxation', icon: FaUsers, path: '/services?category=internationalTaxation' },
    { key: 'loanProjectFinancing', name: 'Loan & Project Financing', icon: FaHandHoldingUsd, path: '/services?category=loanProjectFinancing' },
    { key: 'otherServices', name: 'Other Services', icon: FaBriefcase, path: '/services?category=otherServices' },
  ];

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'About', path: '/about' },
    { name: 'Partners', path: '/partners' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 w-full ${
        isScrolled
          ? 'bg-white shadow-lg py-3'
          : 'bg-white/95 backdrop-blur-sm py-4'
      }`}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group min-w-0 flex-shrink">
            <motion.img
              src="/logo/Untitled_design__35_-removebg-preview.png"
              alt="CA M A K V Logo"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-20 object-contain flex-shrink-0"
            />
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent leading-snug whitespace-normal"
            >
              M A K V & Associates
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => {
              if (link.name === 'Services') {
                return (
                  <div
                    key={link.path}
                    ref={dropdownRef}
                    className="relative"
                    onMouseEnter={() => setIsServicesDropdownOpen(true)}
                    onMouseLeave={() => setIsServicesDropdownOpen(false)}
                  >
                    <Link
                      to={link.path}
                      className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 flex items-center ${
                        location.pathname === link.path
                          ? 'text-primary-600'
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                    >
                      {link.name}
                      <FaChevronDown className={`ml-1 text-xs transition-transform duration-200 ${isServicesDropdownOpen ? 'rotate-180' : ''}`} />
                      {location.pathname === link.path && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
                          initial={false}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </Link>
                    <AnimatePresence>
                      {isServicesDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                        >
                          {serviceCategories.map((category, index) => {
                            const IconComponent = category.icon;
                            return (
                              <Link
                                key={category.key}
                                to={category.path}
                                onClick={() => setIsServicesDropdownOpen(false)}
                                className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200"
                              >
                                <IconComponent className="mr-3 text-primary-600" />
                                <span>{category.name}</span>
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    location.pathname === link.path
                      ? 'text-primary-600'
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  {link.name}
                  {location.pathname === link.path && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            <motion.a
              href="tel:+919950987445"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              +91-99509 87445
            </motion.a>
            
            {/* Login Buttons */}
            {!user ? (
              <>
                <Link
                  to="/login?type=master"
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <FaUserShield className="mr-1" />
                  Office Login
                </Link>
                <Link
                  to="/login?type=client"
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <FaSignInAlt className="mr-1" />
                  Client Login
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={isMaster ? "/admin/dashboard" : "/client/dashboard"}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <FaSignInAlt className="mr-1" />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0 ml-2"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden mt-4 pb-4 space-y-2"
            >
              {navLinks.map((link, index) => {
                if (link.name === 'Services') {
                  return (
                    <motion.div
                      key={link.path}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div
                        onClick={() => setIsServicesDropdownOpen(!isServicesDropdownOpen)}
                        className={`block px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                          location.pathname === link.path
                            ? 'bg-primary-100 text-primary-600'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{link.name}</span>
                          <FaChevronDown className={`text-xs transition-transform duration-200 ${isServicesDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      <AnimatePresence>
                        {isServicesDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="ml-4 mt-2 space-y-1"
                          >
                            {serviceCategories.map((category) => {
                              const IconComponent = category.icon;
                              return (
                                <Link
                                  key={category.key}
                                  to={category.path}
                                  onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    setIsServicesDropdownOpen(false);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                                >
                                  <IconComponent className="mr-2 text-primary-600" />
                                  <span>{category.name}</span>
                                </Link>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                }
                return (
                  <motion.div
                    key={link.path}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-4 py-2 rounded-lg transition-colors ${
                        location.pathname === link.path
                          ? 'bg-primary-100 text-primary-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                );
              })}
              <motion.a
                href="tel:+919950987445"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: navLinks.length * 0.1 }}
                className="block px-4 py-2 bg-primary-600 text-white rounded-lg text-center font-medium hover:bg-primary-700 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                +91-99509 87445
              </motion.a>
              
              {/* Mobile Login Buttons */}
              {!user ? (
                <>
                  <Link
                    to="/login?type=master"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FaUserShield className="mr-2" />
                    Office Login
                  </Link>
                  <Link
                    to="/login?type=client"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FaSignInAlt className="mr-2" />
                    Client Login
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={isMaster ? "/admin/dashboard" : "/client/dashboard"}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <FaSignInAlt className="mr-2" />
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                      navigate('/');
                    }}
                    className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                  >
                    Logout
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
};

export default Header;

