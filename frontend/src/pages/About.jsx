import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaBullseye, FaHandshake, FaBolt, FaLightbulb, FaCheckCircle, FaAward, FaUsers, FaMapMarkerAlt, FaChartLine } from 'react-icons/fa';

const About = () => {
  const values = [
    {
      icon: FaHandshake,
      title: 'Business Partnering',
      description: 'Working together to deliver value to your business',
    },
    {
      icon: FaBullseye,
      title: 'Integrity',
      description: 'Upholding the highest standards of ethics and transparency',
    },
    {
      icon: FaBolt,
      title: 'Passion',
      description: 'Dedicated commitment to excellence in everything we do',
    },
    {
      icon: FaLightbulb,
      title: 'Excellence',
      description: 'Delivering superior quality through experience, expertise and efficiency',
    },
  ];

  const milestones = [
    { year: '2011', title: 'Founded', description: 'Established as a firm of Chartered Accountants' },
    { year: '2015+', title: 'Expansion', description: 'Expanded to multiple locations across India' },
    { year: '2020+', title: 'Global Reach', description: 'Extended services to Dubai and international clients' },
    { year: '2024+', title: 'Leading Firm', description: 'Serving clients across 10+ locations with 25+ professionals' },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50 overflow-x-hidden max-w-full">
      {/* Hero Section */}
      <section className="relative text-white py-24 overflow-hidden max-w-full">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/chartered-accountant-usb-l9394yx2zvrocx54.jpg"
            alt="Background"
            className="w-full h-full object-cover"
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 via-primary-800/70 to-secondary-900/80"></div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              About Us
            </h1>
            
            <p className="text-lg text-primary-200">
              A trusted partner for your business, financial and regulatory needs
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-white overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Our <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Story</span>
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary-600 to-secondary-600 mx-auto"></div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="prose prose-lg max-w-none break-words"
            >
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-6 break-words">
                Established as a premier firm of Chartered Accountants, M A K V & Associates operates from strategic locations 
                in Ahmedabad, Mumbai, and Bhilwara. Our organizational structure is built around specialized verticals, each 
                led by experienced Senior Partners, with a network of associates extending across 10 locations throughout India and Dubai.
              </p>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-6 break-words">
                Our foundation rests on a team of experienced partners and dedicated professionals who bring exceptional expertise 
                to every engagement. Through rigorous training and a commitment to excellence, we consistently deliver high-quality 
                solutions that empower our clients to make informed financial decisions backed by comprehensive analysis and strategic insights.
              </p>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed break-words">
                We understand that every business is unique, which is why we craft customized service offerings tailored to specific 
                client requirements. Our approach is built on three core pillars: Experience, Expertise, and Efficiency. By acting 
                as true business partners, we go beyond traditional accounting services to create lasting value and drive sustainable 
                growth for our clients.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gray-50 overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-white rounded-2xl p-8 shadow-lg"
            >
              <div className="text-4xl text-primary-600 mb-4">
                <FaBullseye />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed break-words">
                To provide clients with a 'One-Stop Solution' for all their business, financial and regulatory requirements. We aim to transform knowledge into values through our commitment to excellence and client success.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-white rounded-2xl p-8 shadow-lg"
            >
              <div className="text-4xl text-primary-600 mb-4">
                <FaLightbulb />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed break-words">
                To be the most trusted and preferred Chartered Accountancy firm, recognized for our expertise, integrity, and commitment to creating value for our clients through innovative solutions and business partnering.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-white overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Our <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Milestones</span>
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary-600 to-secondary-600 mx-auto"></div>
          </motion.div>

          <div className="max-w-5xl mx-auto">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-200 via-primary-400 to-secondary-400 transform md:-translate-x-1/2"></div>

              {milestones.map((milestone, index) => {
                // Alternate pattern: left, right, left, right
                const isLeft = index % 2 === 0;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    className={`relative flex flex-col md:items-center mb-12 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                  >
                    <div className={`flex-1 w-full ${isLeft ? 'md:pr-8 md:text-right' : 'md:pl-8 md:text-left'} ${!isLeft ? 'md:order-2' : ''}`}>
                      <div className={`bg-white rounded-xl p-4 sm:p-6 shadow-lg ${isLeft ? 'border-r-4 md:border-r-4 border-l-4 md:border-l-0 border-primary-600' : 'border-l-4 md:border-l-4 border-r-4 md:border-r-0 border-primary-600'}`}>
                        <div className="text-xl sm:text-2xl font-bold text-primary-600 mb-2">{milestone.year}</div>
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 break-words">{milestone.title}</h3>
                        <p className="text-sm sm:text-base text-gray-600 break-words">{milestone.description}</p>
                      </div>
                    </div>
                    
                    {/* Timeline Dot */}
                    <div className="absolute left-4 md:left-1/2 w-8 h-8 bg-primary-600 rounded-full border-4 border-white shadow-lg transform md:-translate-x-1/2 z-10"></div>
                    
                    <div className={`flex-1 ${isLeft ? 'md:pl-8' : 'md:pr-8'} ${!isLeft ? 'md:order-1' : ''}`}></div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-secondary-50 overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Our <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Core Values</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-primary-600 to-secondary-600 mx-auto mt-4"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center group"
              >
                <div className="text-5xl mb-6 text-primary-600 flex justify-center group-hover:scale-110 transition-transform duration-300">
                  <value.icon />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 break-words">{value.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed break-words">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600 text-white overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 px-2">
              Ready to Work With Us?
            </h2>
            <p className="text-lg sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto px-2 break-words">
              Let's discuss how we can help your business grow and succeed. Our team is ready to provide you with expert guidance and solutions.
            </p>
            <Link to="/contact" onClick={() => window.scrollTo(0, 0)}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                Contact Us Today
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-white overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Why Choose <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Us</span>
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary-600 to-secondary-600 mx-auto"></div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                'State-of-the-art infrastructure located in prime locations',
                'Technically competent and well-trained team members',
                'Comprehensive one-stop solution for all business needs',
                'Strong focus on Experience, Expertise and Efficiency',
                'Business partnering approach to create value',
                'Presence across 10+ locations in India and Dubai',
              ].map((point, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start space-x-3"
                >
                  <FaCheckCircle className="text-primary-600 text-xl flex-shrink-0 mt-1" />
                  <span className="text-gray-700 text-base sm:text-lg break-words">{point}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;

