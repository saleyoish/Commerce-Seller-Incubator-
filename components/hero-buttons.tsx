'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

export default function HeroButtons() {
  const scrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToWaitlist = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('waitlist');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Button 
        size="lg" 
        onClick={scrollToWaitlist}
        className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white text-lg px-8"
      >
        Join Waitlist
        <ArrowRight className="ml-2 w-5 h-5" />
      </Button>
      
      <Button 
        size="lg" 
        onClick={scrollToHowItWorks}
        className="bg-white text-gray-900 hover:bg-gray-900 hover:text-white text-lg px-8"
      >
        <Play className="mr-2 w-5 h-5" />
        See How It Works
      </Button>
    </div>
  );
}
