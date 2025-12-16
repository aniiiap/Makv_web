import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitStatus(null);

    try {
      const response = await axios.post('/api/contact', formData);
      setSubmitStatus({ type: 'success', message: response.data.message });
      setFormData({
        name: '',
        email: '',
        phone: '',
        service: '',
        message: '',
      });
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const offices = [
    {
      city: 'Ahmedabad',
      address: '304, Abhijit 3 Above Pantaloons Mithakhali, Navrangpura, Ahmedabad 380 009',
      phone: '079-40048218',
      mobile: '+91 96017 43735',
      email: 'caankit.sethiya@gmail.com',
    },
    {
      city: 'Mumbai',
      address: '1006, The Corporate Park, Sector 18, Vashi, Navi Mumbai, Mumbai 400 703',
      phone: '022-28570040',
      mobile: '+91 7208460096 | +91 9460273379',
      email: 'kothari.vikas993@gmail.com, nikita.naraniwal422@gmail.com',
    },
    {
      city: 'Bhilwara',
      address: 'Office No 4&5, Second Floor, NTC, Bhilwara, Rajasthan - 311001',
      phone: '',
      mobile: '+91 9950987445',
      email: 'atalmurli@yahoo.in',
    },
  ];

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
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Contact Us
            </h1>
            <p className="text-xl text-primary-100 max-w-2xl mx-auto">
              Get in touch with us for expert financial and legal services
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Offices */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Our Offices
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {offices.map((office, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <h3 className="text-xl font-bold text-primary-600 mb-4">{office.city}</h3>
                  <div className="space-y-3 text-gray-600">
                    <p className="flex items-start space-x-2">
                      <FaMapMarkerAlt className="text-primary-600 flex-shrink-0 mt-1" />
                      <span>{office.address}</span>
                    </p>
                    {office.phone && (
                      <p className="flex items-center space-x-2">
                        <FaPhone className="text-primary-600 flex-shrink-0" />
                        <span>Tel: {office.phone}</span>
                      </p>
                    )}
                    <p className="flex items-center space-x-2">
                      <FaPhone className="text-primary-600 flex-shrink-0" />
                      <a href={`tel:${office.mobile.replace(/\s/g, '').replace(/\|/g, '').split(' ')[0]}`} className="hover:text-primary-600">
                        Mobile: {office.mobile}
                      </a>
                    </p>
                    <p className="flex items-start space-x-2">
                      <FaEnvelope className="text-primary-600 flex-shrink-0 mt-1" />
                      <a href={`mailto:${office.email.split(',')[0]}`} className="hover:text-primary-600 break-all">
                        {office.email}
                      </a>
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-white rounded-2xl p-8 shadow-lg"
            >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Send us a Message
                </h2>

                {submitStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-6 p-4 rounded-lg ${
                      submitStatus.type === 'success'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {submitStatus.message}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="Your Name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="Your Email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="+91-XXXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-2">
                        Service Interested In
                      </label>
                      <select
                        id="service"
                        name="service"
                        value={formData.service}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select a service</option>
                        <option value="Accounting Advisory Services">Accounting Advisory Services</option>
                        <option value="Audit & Assurance">Audit & Assurance</option>
                        <option value="Direct Taxes">Direct Taxes</option>
                        <option value="Indirect Taxes">Indirect Taxes</option>
                        <option value="Financial Planning & Analysis">Financial Planning & Analysis</option>
                        <option value="Business Process Outsourcing">Business Process Outsourcing</option>
                        <option value="Loan & Project Financing">Loan & Project Financing</option>
                        <option value="Other Services">Other Services</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows="5"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                      placeholder="Tell us about your requirements..."
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold text-base hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                  </motion.button>
                </form>
              </motion.div>
          </div>
      </section>
    </div>
  );
};

export default Contact;

