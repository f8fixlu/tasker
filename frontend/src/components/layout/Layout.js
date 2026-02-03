import React from 'react';
import { AppProvider } from '../../context/AppContext';
import Header from '../common/Header';
import Footer from '../common/Footer';

const Layout = ({ children }) => {
  return (
    <AppProvider>
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
        <div className="layout-container flex h-full flex-col">
          <Header />
          <div className="pt-16 flex-grow"> {/* pt-16 to account for fixed header, flex-grow to push footer down */}
            <main className="p-4 sm:p-6">
              <div className="layout-content-container">
                {children}
              </div>
            </main>
          </div>
          <Footer />
        </div>
      </div>
    </AppProvider>
  );
};

export default Layout;