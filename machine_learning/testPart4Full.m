
%% PULMOSENSE - COMPLETE PART 4 TEST
clear;
clc;
close all;

projectRoot = 'C:\Users\ITBP\OneDrive\Documents\MATLAB\Respiratory Sound Project';
addpath(genpath(projectRoot));

dataFolder = fullfile(projectRoot, 'data', 'ICBHI_final_database');

fprintf('\n========================================\n');
fprintf('PULMOSENSE PART 4 TEST\n');
fprintf('========================================\n');

%% STEP 1: Check dataset and required functions

assert(isfolder(dataFolder), ...
    'Dataset folder not found: %s', dataFolder);

assert(~isempty(which('loadICBHI')), ...
    'MATLAB cannot find loadICBHI.m');

assert(~isempty(which('buildFeatureMatrix')), ...
    'MATLAB cannot find buildFeatureMatrix.m');

assert(~isempty(which('runPart4')), ...
    'MATLAB cannot find runPart4.m');

fprintf('Dataset and required functions found.\n');

%% STEP 2: Load recording table

recordingTable = loadICBHI(dataFolder);

%% STEP 3: Recreate the same patient-wise split

[trainData, testData] = patientSplit(recordingTable, 0.8);

fprintf('\nTraining recordings: %d\n', height(trainData));
fprintf('Testing recordings:  %d\n', height(testData));

%% STEP 4: Rebuild feature matrices

fprintf('\nBuilding training features...\n');

[XTrain, YTrain, trainMetadata, featureNames] = ...
    buildFeatureMatrix(trainData, dataFolder);

fprintf('\nBuilding testing features...\n');

[XTest, YTest, testMetadata, featureNamesTest] = ...
    buildFeatureMatrix(testData, dataFolder);

%% STEP 5: Verify inputs

fprintf('\n--- Feature matrix verification ---\n');

fprintf('XTrain: %d rows x %d columns\n', size(XTrain,1), size(XTrain,2));
fprintf('YTrain: %d labels\n', numel(YTrain));
fprintf('XTest:  %d rows x %d columns\n', size(XTest,1), size(XTest,2));
fprintf('YTest:  %d labels\n', numel(YTest));

assert(size(XTrain,1) == numel(YTrain), ...
    'Training feature rows and labels do not match.');

assert(size(XTest,1) == numel(YTest), ...
    'Testing feature rows and labels do not match.');

assert(size(XTrain,2) == size(XTest,2), ...
    'Training and testing feature counts do not match.');

assert(isequal(string(featureNames), string(featureNamesTest)), ...
    'Training and testing feature names or order do not match.');

fprintf('Feature matrices passed the basic checks.\n');

%% STEP 6: Run Part 4

fprintf('\nStarting Part 4 machine-learning pipeline...\n');

part4 = runPart4(XTrain, YTrain, XTest, YTest);

%% STEP 7: Save results if Part 4 completes

outputFile = fullfile(projectRoot, 'Part4_TrainedModels.mat');

save(outputFile, 'part4', 'XTrain', 'YTrain', 'XTest', 'YTest', ...
    'trainMetadata', 'testMetadata', 'featureNames', '-v7.3');

fprintf('\n========================================\n');
fprintf('PART 4 COMPLETED SUCCESSFULLY\n');
fprintf('Saved results to:\n%s\n', outputFile);
fprintf('========================================\n');