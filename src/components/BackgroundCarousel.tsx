import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import bgSlide1 from "../assets/images/slide_f1.webp";
import bgSlide2 from "../assets/images/slide_f2.webp";
import bgSlide3 from "../assets/images/slide_f3.webp";
import bgSlide4 from "../assets/images/slide_f4.webp";

interface BackgroundCarouselProps {
  className?: string;
  children: React.ReactNode;
  overlayClassName?: string;
}

const carouselSlides = [
  {
    image: bgSlide1,
    title: "Bienvenue à l'Institut Saint Jean",
    alt: "Campus ISJ",
  },
  {
    image: bgSlide2,
    title: "Excellence Académique",
    alt: "Vie étudiante ISJ",
  },
  {
    image: bgSlide3,
    title: "Préparation aux Examens",
    alt: "Salle de cours ISJ",
  },
  {
    image: bgSlide4,
    title: "Réussite & Avenir",
    alt: "Diplômés ISJ",
  },
];

export const BackgroundCarousel: React.FC<BackgroundCarouselProps> = ({
  className = "",
  children,
  overlayClassName = "",
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto advance with pause on hover
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!isHovered) {
        setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
      }
    }, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Carousel */}
      <div className="absolute inset-0 z-0 bg-slate-950">
        {carouselSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1500 ease-in-out ${
              index === currentSlide
                ? "opacity-100 scale-100"
                : "opacity-0 scale-110 pointer-events-none"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.alt}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transform transition-transform duration-20000 ease-linear scale-105"
            />
          </div>
        ))}

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-slate-950/20 to-slate-950/40" />
        <div className={`absolute inset-0 ${overlayClassName}`} />
      </div>

      {/* Carousel Controls - Desktop only */}
      <div className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-20 items-center space-x-2 text-indigo-100">
        <button
          onClick={() =>
            setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)
          }
          className="p-2 rounded-full bg-slate-900/70 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-200 transition-all backdrop-blur-md shadow-lg"
          title="Image précédente"
          aria-label="Image précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex space-x-1.5">
          {carouselSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? "w-7 bg-amber-400 shadow-sm shadow-amber-400/50"
                  : "w-2 bg-indigo-900/80 hover:bg-indigo-600"
              }`}
              aria-label={`Aller à l'image ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)}
          className="p-2 rounded-full bg-slate-900/70 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-200 transition-all backdrop-blur-md shadow-lg"
          title="Image suivante"
          aria-label="Image suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};