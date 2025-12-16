import React from 'react';
import { motion } from 'framer-motion';

const ClientsSection = () => {
  const clientLogos = [
    {
      name: 'Titan Company',
      logo: '/serve_logo/Logo_of_Titan_Company__May_2018.svg-removebg-preview.png',
    },
    {
      name: 'Roots',
      logo: '/serve_logo/Roots-logo.png',
    },
    {
      name: 'Vodafone Idea',
      logo: '/serve_logo/Vodafone_Idea_logo.svg.png',
    },
    {
      name: 'CRI Pumps',
      logo: '/serve_logo/CRI-PUMPS-removebg-preview.png',
    },
    {
      name: 'MEGH Energy',
      logo: '/serve_logo/images__3_-removebg-preview.png',
    },
    {
      name: 'BrainMark',
      logo: '/serve_logo/BM-LOGO-300x92-removebg-preview.png',
    },
    {
      name: 'Suryadeep',
      logo: '/serve_logo/surya-deep-alloy-castings-pvt-ltd-removebg-preview.png',
    },
    {
      name: 'Gulf Oil',
      logo: '/serve_logo/Gulf_Oil_logo.svg-removebg-preview.png',
    },
    {
      name: 'Client 1',
      logo: '/serve_logo/Picture1-removebg-preview.png',
    },
    {
      name: 'Client 2',
      logo: '/serve_logo/Picture2-removebg-preview.png',
    },
    {
      name: 'Client 3',
      logo: '/serve_logo/Picture3-removebg-preview.png',
    },
    {
      name: 'Client 4',
      logo: '/serve_logo/Picture4-removebg-preview.png',
    },
    {
      name: 'Client 5',
      logo: '/serve_logo/Picture5-removebg-preview.png',
    },
    {
      name: 'Client 6',
      logo: '/serve_logo/Picture6-removebg-preview.png',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-4xl font-bold mb-4 text-gray-900">
            We Serve To
          </h2>
          <p className="text-lg text-gray-600">
            Trusted by leading companies across industries
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 items-center">
          {clientLogos.map((client, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.1, y: -5 }}
              className="flex items-center justify-center p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300 group"
            >
              <img
                src={client.logo}
                alt={client.name}
                className="max-h-16 max-w-full object-contain transition-all duration-300 opacity-80 group-hover:opacity-100"
                loading="lazy"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientsSection;

