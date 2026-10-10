
%% PULMOSENSE - PART 4 INDEPENDENT DIAGNOSTIC
clear;
clc;

projectRoot = 'C:\Users\ITBP\OneDrive\Documents\MATLAB\Respiratory Sound Project';

fprintf('\n============================================\n');
fprintf('PULMOSENSE PART 4 DIAGNOSTIC\n');
fprintf('============================================\n');

%% 1. Check project folder
fprintf('\n[1] Checking project folder...\n');

if ~isfolder(projectRoot)
    error('Project folder does not exist: %s', projectRoot);
end

fprintf('PASS: Project folder exists.\n');

%% 2. Add project folders to MATLAB path
fprintf('\n[2] Adding project folders to path...\n');

addpath(genpath(projectRoot));

fprintf('PASS: Project folders added.\n');

%% 3. Check runPart4
fprintf('\n[3] Checking runPart4.m...\n');

part4Path = which('runPart4');

if isempty(part4Path)
    error('FAIL: MATLAB cannot find runPart4.m.');
end

fprintf('PASS: Found runPart4 at:\n%s\n', part4Path);

%% 4. Check required Part 4 files
fprintf('\n[4] Checking required ML functions...\n');

requiredFunctions = {
    'prepareMLData'
    'trainSVM'
    'trainRandomForest'
    'trainKNN'
    'trainEnsemble'
    'evaluateModel'
    'compareModels'
};

for k = 1:numel(requiredFunctions)
    functionName = requiredFunctions{k};
    functionPath = which(functionName);

    if isempty(functionPath)
        fprintf('MISSING: %s\n', functionName);
    else
        fprintf('FOUND: %s\n', functionName);
    end
end

%% 5. Check existing training data in workspace
fprintf('\n[5] Checking training variables...\n');

fprintf(['This test script has its own workspace. It cannot automatically ' ...
         'see variables created inside main.m.\n']);

fprintf('Expected variables before Part 4:\n');
fprintf('XTrain, YTrain, XTest, YTest\n');

%% 6. Check for existing trained-model file
fprintf('\n[6] Checking saved model file...\n');

modelFile = fullfile(projectRoot, 'Part4_TrainedModels.mat');

if isfile(modelFile)
    fprintf('FOUND: %s\n', modelFile);
else
    fprintf('NOT FOUND: %s\n', modelFile);
    fprintf('This is not necessarily an error if Part 4 has never completed.\n');
end

%% 7. Report next step
fprintf('\n============================================\n');
fprintf('PATH DIAGNOSTIC COMPLETED\n');
fprintf('============================================\n');

fprintf(['If all required functions are FOUND, the next step is to test ' ...
         'the Part 4 inputs and call runPart4 directly.\n']);