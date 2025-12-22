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
      email: 'atalmurli@yahoo.in',
      phone: '+91 99509 87445',
      linkedin: 'https://www.linkedin.com/in/ca-murli-atal-2ba75094/',
      qualifications: [
        'Qualified CA in 2015 (First attempt at all levels)',
        'Treasurer of ICAI Bhilwara branch (2022-23) & CICSA Chairman (2023-24) & Secretary (2024-25)',
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
      email: 'CAANKIT.SETHIYA@GMAIL.COM',
      phone: '+91 96017 43735',
      linkedin: '',
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
      email: 'kothari.vikas993@gmail.com',
      phone: '+91 72084 60096',
      linkedin: '',
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
      shortDescription: 'Specializes in Internal Audit, Stock Audit, Tax Audits (Direct & Indirect), and Statutory Audits.',
      email: 'nimsnogia@gmail.com',
      phone: '+91 81188 25153',
      linkedin: '',
      qualifications: [
        'Chartered Accountant (CA) qualified in November 2018, with over 7 years of hands-on professional experience',
        'Specializes in Internal Audit, Stock Audit, Tax Audits (Direct & Indirect), and Statutory Audits, ensuring comprehensive compliance and assurance',
        'Has successfully managed and filed 1500+ Income Tax Returns (ITRs), demonstrating exceptional skill in tax planning, compliance, and litigation',
        'Gained substantial expertise by performing internal audits for major corporations, including GCMMF (Amul) - The Gujarat Cooperative Milk Marketing Federation, and Cipla Ltd. - A leading multinational pharmaceutical company',
      ],
      expertise: ['Internal Audit', 'Stock Audit', 'Tax Audits', 'Statutory Audits', 'Tax Planning & Compliance', 'Tax Litigation'],
    },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50 overflow-x-hidden max-w-full">
      {/* Hero Section */}
      <section className="relative text-white py-20 overflow-hidden max-w-full">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
            <img
              src="/images/360_F_1131253189_fkD2TvFUZTfleR95SSmpzTRgTLlXFpeP.jpg"
              alt="Background"
              className="w-full h-full object-cover object-center"
            />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/50 via-primary-800/40 to-secondary-900/50"></div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 px-2">
              Our Partners
            </h1>
            <p className="text-lg sm:text-xl text-primary-100 max-w-2xl mx-auto px-2">
              Meet our experienced partners who bring expertise and dedication to every client engagement
            </p>
          </motion.div>
        </div>
      </section>

      {/* Partners List Section */}
      <section className="py-20 bg-white overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
          <div className="space-y-12 max-w-5xl mx-auto">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden max-w-full"
              >
                <div className="flex flex-col lg:flex-row max-w-full">
                  {/* Image Section */}
                  <div className="lg:w-2/5 bg-gradient-to-br from-primary-50 to-secondary-50 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 w-full">
                    <motion.img
                      src={member.image}
                      alt={member.name}
                      className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full object-cover shadow-xl border-4 border-white mb-6"
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
                  <div className="lg:w-3/5 p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col justify-center bg-white w-full">
                    {/* Overview */}
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-8 bg-gradient-to-b from-primary-600 to-secondary-600 rounded-full"></div>
                        <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <FaBriefcase className="text-primary-600" />
                          Overview
                        </h4>
                      </div>
                      <p className="text-gray-700 leading-relaxed text-sm sm:text-base pl-2 sm:pl-4 break-words">
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
                            <span className="text-gray-700 leading-relaxed text-sm sm:text-base group-hover:text-gray-900 transition-colors break-words">
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

