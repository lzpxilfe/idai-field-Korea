/* eslint-disable no-undef */
const { getDefaultConfig } = require('@expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const { mergeConfig } = require('metro-config');
const fs = require('fs');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
const mobileNodeModulesDir = path.resolve(__dirname, 'node_modules');
const mobileNodeModulesRealDir = fs.realpathSync(mobileNodeModulesDir);
const resolveFromMobileRoot = (moduleName) =>
    path.resolve(__dirname, moduleName.replace(/^@\//, ''));
const resolveFromMobileNodeModules = (moduleName) =>
    path.resolve(mobileNodeModulesRealDir, moduleName);
const corePackageDir = path.resolve(__dirname, '../core');
const corePackageEntryFile = path.resolve(corePackageDir, 'index.ts');
const emptyCoreTestModule = path.resolve(__dirname, 'shims/empty-core-test-module.js');
const corePackageEntryFiles = [
    path.resolve(corePackageDir, 'dist/index.js'),
    corePackageEntryFile,
    path.resolve(corePackageDir, 'index.js')
].map((filePath) => path.normalize(filePath).toLowerCase());

const forcedMobileModules = [
    'expo-router',
    'react',
    'react-native',
    '@react-native',
    '@react-native-async-storage/async-storage',
    'uuid',
    '@neighbourhoodie/pouchdb-asyncstorage-adapter'
];

const shouldResolveFromMobileNodeModules = (moduleName) =>
    forcedMobileModules.some((forcedModule) =>
        moduleName === forcedModule || moduleName.startsWith(`${forcedModule}/`)
    );

const isCoreTestExport = (context, moduleName) =>
    (moduleName === './test' || moduleName === './test/index')
    && corePackageEntryFiles.includes(path.normalize(context.originModulePath).toLowerCase());

const customConfig = {
    resolver: {
        blockList: exclusionList([
            /android[\\\/]\.cxx(?:\.[^\\\/]+)?(?:[\\\/].*)?$/,
            /android[\\\/]build(?:\.[^\\\/]+)?(?:[\\\/].*)?$/,
            /android[\\\/]app[\\\/]build(?:[\\\/].*)?$/,
            /node_modules[\\\/].*[\\\/]android[\\\/]\.cxx(?:\.[^\\\/]+)?(?:[\\\/].*)?$/,
            /node_modules[\\\/].*[\\\/]android[\\\/]build(?:\.[^\\\/]+)?(?:[\\\/].*)?$/
        ]),
        resolveRequest: (context, moduleName, platform) => {
            if (moduleName.startsWith('@/')) {
                return context.resolveRequest(
                    context,
                    resolveFromMobileRoot(moduleName),
                    platform
                );
            }

            if (isCoreTestExport(context, moduleName)) {
                return context.resolveRequest(
                    context,
                    emptyCoreTestModule,
                    platform
                );
            }

            if (moduleName === 'idai-field-core') {
                return context.resolveRequest(
                    context,
                    corePackageEntryFile,
                    platform
                );
            }

            if (shouldResolveFromMobileNodeModules(moduleName)) {
                return context.resolveRequest(
                    context,
                    resolveFromMobileNodeModules(moduleName),
                    platform
                );
            }

            return context.resolveRequest(context, moduleName, platform);
        },
        nodeModulesPaths: [
            mobileNodeModulesDir
        ],
        extraNodeModules: {
            'idai-field-core': path.resolve(__dirname, '../core'),
            react: path.resolve(__dirname, 'node_modules/react'),
            'react-native': path.resolve(__dirname, 'node_modules/react-native'),
            '@react-native': path.resolve(__dirname, 'node_modules/@react-native'),
            '@react-native-async-storage/async-storage': path.resolve(
                __dirname,
                'node_modules/@react-native-async-storage/async-storage'
            ),
            '@neighbourhoodie/pouchdb-asyncstorage-adapter': path.resolve(
                __dirname,
                'node_modules/@neighbourhoodie/pouchdb-asyncstorage-adapter'
            ),
            uuid: path.resolve(__dirname, 'node_modules/uuid')
        }
    },
    watchFolders: [
        path.resolve(__dirname, '../core')
    ]
};

module.exports = mergeConfig(defaultConfig, customConfig);
