import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Hero from '../components/Hero.jsx';
import ServicesSection from '../components/ServicesSection.jsx';
import AboutSection from '../components/AboutSection.jsx';
import StatsSection from '../components/StatsSection.jsx';
import QuickServicesSection from '../components/QuickServicesSection.jsx';
import ClientsSection from '../components/ClientsSection.jsx';

const Home = () => {
  return (
    <div className="pt-20">
      <Hero />
      <AboutSection />
      <ServicesSection />
      <QuickServicesSection />
      <StatsSection />
      <ClientsSection />
    </div>
  );
};

export default Home;

