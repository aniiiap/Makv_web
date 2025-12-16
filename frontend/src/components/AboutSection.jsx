import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaBriefcase, FaUsers, FaMapMarkerAlt, FaCheckCircle } from 'react-icons/fa';

const AboutSection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
                <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
                  <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    Who We Are?
                  </span>
                </h2>
            <p className="text-base text-gray-600 mb-6 leading-relaxed">
              M A K V & Associates is a firm of Chartered Accountants based at Ahmedabad, Mumbai & Bhilwara. 
              The Firm's different verticals are headed by Senior Partners and having associates at 10 locations 
              in India and Dubai.
            </p>
            <p className="text-base text-gray-600 mb-8 leading-relaxed">
              We are seasoned and talented team of chartered accountants with strength of 5+ partners and 25 workforce. 
              Our highly trained, motivated and sharpest talent brings quality in their work and deliver the best solutions. 
              We help our clients in making various financial decisions by providing them proper study in proper formats.
            </p>
            <Link to="/about">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Read More
              </motion.button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl p-8 shadow-2xl">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: FaBriefcase, title: 'Partners', number: '5+' },
                  { icon: FaUsers, title: 'Workforce', number: '25+' },
                  { icon: FaMapMarkerAlt, title: 'Locations', number: '10+' },
                  { icon: FaCheckCircle, title: 'Years Experience', number: '13+' },
                ].map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-white rounded-xl p-6 shadow-lg text-center"
                  >
                    <div className="text-4xl mb-3 text-primary-600 flex justify-center">
                      <IconComponent />
                    </div>
                    <div className="text-2xl font-bold text-primary-600 mb-2">{item.number}</div>
                    <div className="text-sm text-gray-600">{item.title}</div>
                  </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;

