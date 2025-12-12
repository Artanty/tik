const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const mf = require("@angular-architects/module-federation/webpack");
const path = require("path");
const share = mf.share;
const Dotenv = require('dotenv-webpack');

const sharedMappings = new mf.SharedMappings();
sharedMappings.register(
  path.join(__dirname, 'tsconfig.json'),
  [/* mapped paths to share */]);

module.exports = {
  output: {
    uniqueName: "tik",
    publicPath: "http://localhost:4219/", // Use explicit URL instead of 'auto'
    chunkLoadingGlobal: 'webpackJsonp_tik', // Add unique chunk loading global
    scriptType: 'text/javascript'
  },
  optimization: {
    runtimeChunk: false,
    chunkIds: 'named' // Better for debugging
  },
  resolve: {
    alias: {
      ...sharedMappings.getAliases(),
    }
  },
  experiments: {
    outputModule: false
  },
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    },
    allowedHosts: 'all',
    hot: true
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "tik",
      filename: "remoteEntry4219.js",
      exposes: {
        './TikModule': './src/app/tik/tik.module.ts',
        // './Component': './src/app/tik/gui.component.ts',
        // './Exposed': './src/app/tik/_exposed/index.ts',
      },
      shared: share({
        "@angular/core": { 
          singleton: true, 
          strictVersion: true, 
          requiredVersion: '17.0.5', 
          eager: true 
        },
        "@angular/common": { 
          singleton: true, 
          strictVersion: true, 
          requiredVersion: '17.0.5', 
          eager: true 
        },
        "@angular/common/http": { 
          singleton: true, 
          strictVersion: true, 
          requiredVersion: '17.0.5', 
          eager: true 
        },
        "@angular/router": { 
          singleton: true, 
          strictVersion: true, 
          requiredVersion: '17.0.5', 
          eager: true 
        },
        "@angular/compiler": {
          singleton: true,
          strictVersion: true,
          requiredVersion: '17.0.5',
          eager: true
        },
        "@angular/platform-browser": {
          singleton: true,
          strictVersion: true,
          requiredVersion: '17.0.5',
          eager: true
        },
        "rxjs": {
          singleton: true,
          strictVersion: true,
          requiredVersion: '~7.8.0',
          eager: true
        },
        "typlib": { 
          singleton: true, 
          strictVersion: false, // Change to false if version mismatches occur
          requiredVersion: 'auto', 
          eager: true 
        },
        ...sharedMappings.getDescriptors(),
      })
    }),
    sharedMappings.getPlugin(),
    new Dotenv({
      path: './.env',
      systemvars: true, // Include system environment variables
      safe: true // Load .env.example to verify all variables are set
    })
  ],
};
