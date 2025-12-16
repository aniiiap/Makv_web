import React from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaLinkedin, FaEnvelope, FaPhone, FaBriefcase, FaGraduationCap } from 'react-icons/fa';

const Partners = () => {

  const teamMembers = [
    {
      id: 1,
      name: 'CA Murli Atal',
      designation: 'Partner & Global Strategy Advisor',
      image: '/team/Murli.jpeg',
      shortDescription: 'Expert in Global Strategy Advisor, CFO Services, BPO, project financing, and government subsidies.',
      email: 'murli@makvassociates.com',
      phone: '+91 99509 87445',
      linkedin: 'https://www.linkedin.com/in/ca-murli-atal-2ba75094/',
      qualifications: [
        'Qualified CA in 2015 (First attempt at all levels)',
        'Treasurer of ICAI Bhilwara branch (2022-23) & CICSA Chairman (2023-24)',
        'Expert in Direct & Indirect taxes, project financing, government subsidies, and MSME schemes',
        'Former manager at Reliance Nippon Insurance Co Ltd.',
        'Independent director of Shankar Lal Rampal Dyechem Limited',
      ],
      expertise: ['Direct Taxes', 'Indirect Taxes', 'Project Financing', 'Government Subsidies', 'MSME Schemes'],
    },
    {
      id: 2,
      name: 'CA Ankit Sethiya',
      designation: 'Partner & Head of Indirect Taxation',
      image: '/team/Ankit Sethiya.png',
      shortDescription: 'Expert in Statutory Audits, GST litigation, Tax Audits, and Company Law compliances.',
      email: 'ankit@makvassociates.com',
      phone: '+91 96017 43735',
      linkedin: 'https://linkedin.com/in/ankitsethiya',
      qualifications: [
        'Qualified CA in 2017',
        'Articleship with Ambalal Patel & Company, Ahmedabad',
        'Expert in Statutory Audits, Tax Audits, GST litigation, and Company Law compliances',
        'Specialized in handling search cases in GST and Income Tax',
        'Experience in Internal Audits, concurrent audits, and SOP implementation',
      ],
      expertise: ['Statutory Audit', 'GST Litigation', 'Tax Audit', 'Company Law', 'Internal Audit'],
    },
    {
      id: 3,
      name: 'CA Vikas Kothari',
      designation: 'Partner & Head of Financial Advisory',
      image: '/team/Vikas kothari.png',
      shortDescription: 'Expert in financial advisory, project financing, and investment advisory.',
      email: 'vikas@makvassociates.com',
      phone: '+91 72084 60096',
      linkedin: 'https://linkedin.com/in/vikaskothari',
      qualifications: [
        'Qualified CA in 2015 (First attempt at all levels)',
        'All India 14th Rank Holder in CS executive',
        'Former Manager at ICICI Bank Head Office (2 years)',
        'Expert in financial advisory, project financing, and investment advisory',
        'Awarded by Devendra Fadnavis (CM of Maharashtra) for contribution in arranging finance facilities',
        'Committee member of Jain Chartered Accountant of India',
      ],
      expertise: ['Financial Advisory', 'Project Financing', 'Investment Advisory', 'Banking', 'Corporate Finance'],
    },
    {
      id: 4,
      name: 'CA Nimit Nogia',
      designation: 'Partner & Head of Direct Taxation',
      image: '/team/Nimit.png',
      shortDescription: 'Expert in financial advisory, project financing, and investment advisory.',
      email: 'nimit@makvassociates.com',
      phone: '+91 81188 25153',
      linkedin: 'https://linkedin.com/in/vikaskothari',
      qualifications: [
        'Qualified CA in 2015 (First attempt at all levels)',
        'All India 14th Rank Holder in CS executive',
        'Former Manager at ICICI Bank Head Office (2 years)',
        'Expert in financial advisory, project financing, and investment advisory',
        'Awarded by Devendra Fadnavis (CM of Maharashtra) for contribution in arranging finance facilities',
        'Committee member of Jain Chartered Accountant of India',
      ],
      expertise: ['Financial Advisory', 'Project Financing', 'Investment Advisory', 'Banking', 'Corporate Finance'],
    },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative text-white py-20 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/360_F_1131253189_fkD2TvFUZTfleR95SSmpzTRgTLlXFpeP.jpg"
            alt="Background"
            className="w-full h-full object-cover object-center scale-110 min-h-full min-w-full"
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/50 via-primary-800/40 to-secondary-900/50"></div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Our Partners
            </h1>
            <p className="text-xl text-primary-100 max-w-2xl mx-auto">
              Meet our experienced partners who bring expertise and dedication to every client engagement
            </p>
          </motion.div>
        </div>
      </section>

      {/* Partners List Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 max-w-5xl mx-auto">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row">
                  {/* Image Section */}
                  <div className="lg:w-2/5 bg-gradient-to-br from-primary-50 to-secondary-50 flex flex-col items-center justify-center p-8 lg:p-12">
                    <motion.img
                      src={member.image}
                      alt={member.name}
                      className="w-48 h-48 rounded-full object-cover shadow-xl border-4 border-white mb-6"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    {/* Name & Designation */}
                    <div className="text-center mb-6">
                      <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {member.name}
                      </h3>
                      <p className="text-primary-600 font-semibold text-lg">
                        {member.designation}
                      </p>
                    </div>

                    {/* Social Links */}
                    <div className="flex items-center justify-center gap-3">
                      {member.linkedin && (
                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                          aria-label={`${member.name} LinkedIn`}
                        >
                          <FaLinkedin className="text-lg" />
                        </a>
                      )}
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="w-12 h-12 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300 transition-colors duration-200 shadow-md hover:shadow-lg"
                          aria-label={`Email ${member.name}`}
                        >
                          <FaEnvelope className="text-lg" />
                        </a>
                      )}
                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="w-12 h-12 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300 transition-colors duration-200 shadow-md hover:shadow-lg"
                          aria-label={`Call ${member.name}`}
                        >
                          <FaPhone className="text-lg" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="lg:w-3/5 p-8 lg:p-12 flex flex-col justify-center bg-white">
                    {/* Overview */}
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-8 bg-gradient-to-b from-primary-600 to-secondary-600 rounded-full"></div>
                        <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <FaBriefcase className="text-primary-600" />
                          Overview
                        </h4>
                      </div>
                      <p className="text-gray-700 leading-relaxed text-base pl-4">
                        {member.shortDescription}
                      </p>
                    </div>

                    {/* Qualifications */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-8 bg-gradient-to-b from-primary-600 to-secondary-600 rounded-full"></div>
                        <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <FaGraduationCap className="text-primary-600" />
                          Qualifications & Experience
                        </h4>
                      </div>
                      <div className="space-y-2 pl-4">
                        {member.qualifications.map((qualification, qIndex) => (
                          <div key={qIndex} className="flex items-start gap-3 group">
                            <div className="mt-1">
                              <FaCheckCircle className="text-primary-600 flex-shrink-0 text-lg group-hover:scale-110 transition-transform duration-200" />
                            </div>
                            <span className="text-gray-700 leading-relaxed text-base group-hover:text-gray-900 transition-colors">
                              {qualification}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Partners;

