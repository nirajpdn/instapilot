import DashboardPreview from "@/components/landing/dashboard-preview";
import Features from "@/components/landing/features";
import HeroSection from "@/components/landing/hero";
import React from "react";

const Home = () => {
  return (
    <>
      <HeroSection />
      <div id="features">
        <Features />
      </div>
      <div id="dashboard">
        <DashboardPreview />
      </div>
    </>
  );
};

export default Home;
