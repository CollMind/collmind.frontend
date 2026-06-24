import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { CollMindLogo } from '@/components/common/CollMindLogo';

type AuthView = 'login' | 'register' | 'forgot-password';

export function AuthLayout() {
  const [currentView, setCurrentView] = useState<AuthView>('login');

  return (
    <div className="min-h-screen flex">
      {/* Left Grid - Forms */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-12 xl:px-20 bg-white dark:bg-gray-900">
        <div className="max-w-md w-full mx-auto">
          {/* Logo/Brand */}
          <div className="mb-8">
            <div className="mb-6">
              <CollMindLogo
                showText={true}
                size="lg"
                className="text-gray-900 dark:text-white"
              />
            </div>
            <h1 className="text-3xl font-sans font-bold text-gray-900 dark:text-white tracking-tight">
              {currentView === 'login' && 'Welcome Back'}
              {currentView === 'register' && 'Get Started'}
              {currentView === 'forgot-password' && 'Reset Password'}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {currentView === 'login' && 'Sign in to your account to continue'}
              {currentView === 'register' &&
                'Create your account to get started'}
              {currentView === 'forgot-password' &&
                'Enter your email to reset your password'}
            </p>
          </div>

          {/* Form Container with Animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'login' && (
                <LoginForm
                  onSwitchToRegister={() => setCurrentView('register')}
                  onSwitchToForgotPassword={() =>
                    setCurrentView('forgot-password')
                  }
                />
              )}
              {/* Add register and forgot password forms here */}
            </motion.div>
          </AnimatePresence>

          {/* Footer Links */}
          <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>
              By continuing, you agree to our{' '}
              <a
                href="/terms"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="/privacy"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Grid - Banner/Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900 relative overflow-hidden">
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white h-full">
          {/* Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8"
            >
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <span className="text-sm font-medium">
                Next Generation FMCG Solutions
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl xl:text-6xl font-bold mb-6 leading-tight"
            >
              <span className="text-white">Collaborative</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent">
                Intelligence
              </span>
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg xl:text-xl mb-8 text-white/90 leading-relaxed"
            >
              Delivering world-class Connected solutions for FMCG
              companies—powered by advanced analytics, intuitive interfaces, and
              seamless system integration.
            </motion.p>

            {/* Data Display Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-80 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl"
            >
              {/* System Status */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-sm font-medium text-white">
                  System Status: Optimized
                </span>
              </div>

              {/* Progress Bars */}
              <div className="space-y-3 mb-4">
                <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 1, delay: 1 }}
                    className="absolute inset-y-0 left-0 bg-blue-400 rounded-full"
                  />
                </div>
                <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '78%' }}
                    transition={{ duration: 1, delay: 1.2 }}
                    className="absolute inset-y-0 left-0 bg-purple-400 rounded-full"
                  />
                </div>
              </div>

              {/* Efficiency Metric */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="text-3xl font-bold text-white"
              >
                +24% Efficiency
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Abstract Circular Graphics */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Large light blue circle - upper right */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.3, scale: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="absolute top-20 right-20 w-64 h-64 bg-blue-400 rounded-full blur-3xl"
            />

            {/* Medium purple circle - lower right */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.4, scale: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="absolute bottom-32 right-32 w-48 h-48 bg-purple-400 rounded-full blur-3xl"
            />

            {/* Smaller circles for depth */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ duration: 1, delay: 1 }}
              className="absolute top-40 right-40 w-32 h-32 bg-blue-300 rounded-full blur-2xl"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              transition={{ duration: 1, delay: 1.2 }}
              className="absolute bottom-40 right-40 w-40 h-40 bg-purple-300 rounded-full blur-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
