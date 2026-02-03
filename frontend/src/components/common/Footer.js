import React from 'react';
import { useModal } from '../../hooks/useModal';

const Footer = () => {
  const { openAboutModal } = useModal();

  return (
    <footer className="w-full mt-10">
      <div className="flex items-center justify-between whitespace-nowrap border-t border-solid border-[#F5F5F5] dark:border-gray-700 px-10 py-4 bg-white dark:bg-background-dark">
        <p className="text-sm text-[#617589] dark:text-gray-400">© 2025 Tasker. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <button
            className="text-[#617589] dark:text-gray-400 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal cursor-pointer"
            onClick={openAboutModal}
          >
            About
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;