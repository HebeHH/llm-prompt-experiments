import Link from 'next/link';
import React from 'react';

interface HeaderProps {
  rightContent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ rightContent }) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-end">
        <Link href="/" className="text-2xl font-bold text-white hover:text-violet-100 transition-colors">
          s<span className="text-violet-300">hebe</span>testing
        </Link>
        <Link 
          href="https://shebecoding.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="ml-1 text-sm italic text-gray-300 hover:opacity-80 transition-colors flex items-end"
        >
          <span className="text-gray-300 pr-1 ">by</span>
          <span className="text-[#81d8df]">s<span className="text-[#effcfc]">hebe</span>coding</span>
        </Link>
      </div>
      {rightContent}
    </div>
  );
}; 