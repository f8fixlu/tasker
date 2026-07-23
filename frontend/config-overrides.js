const path = require('path');

module.exports = {
  webpack: function(config, env) {
    // Disable eslint during production builds
    if (env === 'production') {
      config.plugins = config.plugins.filter(
        plugin => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );

      // Disable source maps in production to reduce bundle size
      config.devtool = false;

      // Remove prop-types in production to reduce bundle size
      config.module.rules.forEach(rule => {
        if (rule.oneOf) {
          rule.oneOf.forEach(oneOfRule => {
            const loaderOptions = oneOfRule.options || (oneOfRule.use && oneOfRule.use.options);
            const loaderPath = oneOfRule.loader || (oneOfRule.use && oneOfRule.use.loader) || '';
            if (typeof loaderPath === 'string' && loaderPath.includes('babel-loader') && loaderOptions) {
              loaderOptions.plugins = loaderOptions.plugins || [];
              loaderOptions.plugins.push('transform-react-remove-prop-types');
            }
          });
        }
      });

      // Add splitChunks configuration for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 8,
          minSize: 20000,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
              name: 'vendor-react',
              chunks: 'all',
              priority: 10,
            },
            chartjs: {
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              name: 'vendor-chartjs',
              chunks: 'all',
              priority: 10,
            },
            pdf: {
              test: /[\\/]node_modules[\\/](pdfmake|pdfjs-dist)[\\/]/,
              name: 'vendor-pdf',
              chunks: 'all',
              priority: 10,
            },
            common: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Add bundle analyzer for production builds when ANALYZE_BUNDLE environment variable is set
    if (env === 'production' && process.env.ANALYZE_BUNDLE) {
      const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
      config.plugins.push(new BundleAnalyzerPlugin());
    }

    return config;
  },
  devServer: function(configFunction) {
    return function(proxy, allowedHost) {
      const config = configFunction(proxy, allowedHost);

      // Ensure allowedHosts is properly configured
      if (config.allowedHosts && Array.isArray(config.allowedHosts)) {
        // Filter out any empty strings from allowedHosts
        config.allowedHosts = config.allowedHosts.filter(host => host && host.trim() !== '');

        // Add localhost if not present
        if (!config.allowedHosts.includes('localhost')) {
          config.allowedHosts.push('localhost');
        }

        // Add 0.0.0.0 if not present (for Docker/containerized environments)
        if (!config.allowedHosts.includes('0.0.0.0')) {
          config.allowedHosts.push('0.0.0.0');
        }
      } else {
        // Set a default allowedHosts if none exists or is invalid
        config.allowedHosts = ['localhost', '0.0.0.0'];
      }

      return config;
    };
  }
};