import React from 'react';
import { FaUsers, FaStar, FaMapMarkerAlt, FaBriefcase } from 'react-icons/fa';

const StatsSection = () => {
  const stats = [
    { number: '5+', label: 'Partners', icon: FaUsers },
    { number: '25+', label: 'Workforce', icon: FaBriefcase },
    { number: '10+', label: 'Locations', icon: FaMapMarkerAlt },
    { number: '13+', label: 'Years Experience', icon: FaStar },
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600 text-white overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 px-2 break-words">
            Our Achievements
          </h2>
          <p className="text-lg sm:text-xl text-primary-100 px-2 break-words">
            Trusted by thousands of clients across India
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-all duration-300"
            >
              <div className="text-4xl mb-4 flex justify-center">
                <stat.icon />
              </div>
              <div className="text-3xl sm:text-4xl font-bold mb-2">
                {stat.number}
              </div>
              <div className="text-base sm:text-lg text-primary-100 break-words">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

