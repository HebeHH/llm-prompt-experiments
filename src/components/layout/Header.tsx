import Link from 'next/link';
import React from 'react';

interface HeaderProps {
  rightContent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ rightContent }) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center">
        <Link href="/" className="text-2xl font-bold text-white hover:text-violet-100 transition-colors">
          s<span className="text-violet-300">hebe</span>testing
        </Link>
        <Link 
          href="https://shebecoding.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="ml-2 text-sm italic text-gray-300 hover:text-violet-200 transition-colors"
        >
          by s<span className="text-violet-300">hebe</span>coding
        </Link>
      </div>
      {rightContent}
    </div>
  );
}; 