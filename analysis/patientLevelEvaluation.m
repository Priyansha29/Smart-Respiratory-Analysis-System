
function patientResults = patientLevelEvaluation(model, XTest, YTest, testMetadata)

fprintf('\n====================================================\n');
fprintf('PART 5.4 - PATIENT / RECORDING LEVEL EVALUATION\n');
fprintf('====================================================\n');

% Initialize output so every exit path returns a consistent structure
patientResults = struct();
patientResults.Available = false;

% ----------------------------------------------------
% Validate inputs
% ----------------------------------------------------

if nargin < 4 || isempty(testMetadata)
    fprintf('\nMetadata is missing. Skipping patient-level evaluation.\n');
    return;
end

if isempty(XTest) || isempty(YTest)
    fprintf('\nTest data is empty. Skipping patient-level evaluation.\n');
    return;
end

if size(XTest,1) ~= numel(YTest)
    fprintf('\nXTest and YTest have different sample counts.\n');
    return;
end

% ----------------------------------------------------
% Predict
% ----------------------------------------------------

try
    [YPred, ~] = predict(model, XTest);
catch ME
    fprintf('\nModel prediction failed: %s\n', ME.message);
    return;
end

YPred = categorical(YPred(:));
YTest = categorical(YTest(:));

% ----------------------------------------------------
% Read metadata variable names safely
% ----------------------------------------------------

if istable(testMetadata)
    variableNames = string(testMetadata.Properties.VariableNames);

elseif isstruct(testMetadata)
    variableNames = string(fieldnames(testMetadata));

else
    fprintf('\nUnsupported metadata type: %s\n', class(testMetadata));
    fprintf('Expected a table or struct with a patient ID field.\n');
    return;
end

patientVariable = find(contains(lower(variableNames), 'patient'), 1);

if isempty(patientVariable)
    fprintf('\nPatient ID not found in metadata.\n');
    fprintf('Skipping patient-level aggregation.\n');
    return;
end

patientVariableName = char(variableNames(patientVariable));

% ----------------------------------------------------
% Extract patient IDs
% ----------------------------------------------------

try
    if istable(testMetadata)
        patientID = testMetadata.(patientVariableName);
    else
        patientID = {testMetadata.(patientVariableName)}';
    end
catch ME
    fprintf('\nCould not read patient IDs: %s\n', ME.message);
    return;
end

% Convert patient IDs to a column of strings
if iscell(patientID)
    patientID = string(patientID);
elseif iscategorical(patientID)
    patientID = string(patientID);
else
    patientID = string(patientID);
end

patientID = patientID(:);

% Metadata must have one row per test sample
if numel(patientID) ~= numel(YTest)
    fprintf('\nMetadata/sample count mismatch.\n');
    fprintf('Metadata patient IDs: %d\n', numel(patientID));
    fprintf('Test samples: %d\n', numel(YTest));
    fprintf('Skipping patient-level aggregation to avoid invalid results.\n');
    return;
end

% Remove rows with missing patient IDs consistently
validRows = ~ismissing(patientID) & strlength(strtrim(patientID)) > 0;

patientID = patientID(validRows);
YTest = YTest(validRows);
YPred = YPred(validRows);

if isempty(patientID)
    fprintf('\nNo valid patient IDs found. Skipping evaluation.\n');
    return;
end

uniquePatients = unique(patientID);
numPatients = numel(uniquePatients);

patientTrue = strings(numPatients,1);
patientPred = strings(numPatients,1);
patientCycleCount = zeros(numPatients,1);

% ----------------------------------------------------
% Majority voting per patient
% ----------------------------------------------------

for i = 1:numPatients

    currentPatient = uniquePatients(i);
    mask = patientID == currentPatient;

    currentTrue = YTest(mask);
    currentPred = YPred(mask);

    patientCycleCount(i) = sum(mask);

    % Majority true label
    trueCategories = categories(removecats(currentTrue));
    trueCounts = zeros(numel(trueCategories),1);

    for c = 1:numel(trueCategories)
        trueCounts(c) = sum(currentTrue == trueCategories{c});
    end

    [~, trueIndex] = max(trueCounts);
    patientTrue(i) = string(trueCategories{trueIndex});

    % Majority predicted label
    predCategories = categories(removecats(currentPred));
    predCounts = zeros(numel(predCategories),1);

    for c = 1:numel(predCategories)
        predCounts(c) = sum(currentPred == predCategories{c});
    end

    [~, predIndex] = max(predCounts);
    patientPred(i) = string(predCategories{predIndex});

end

% ----------------------------------------------------
% Patient-level accuracy
% ----------------------------------------------------

patientAccuracy = mean(patientTrue == patientPred);

fprintf('\nPATIENT-LEVEL RESULTS\n');
fprintf('--------------------------------------------\n');
fprintf('Patients evaluated       : %d\n', numPatients);
fprintf('Average cycles per patient: %.2f\n', mean(patientCycleCount));
fprintf('Patient-level accuracy   : %.2f %%\n', patientAccuracy*100);

% ----------------------------------------------------
% Confusion matrix
% ----------------------------------------------------

allClasses = unique([patientTrue; patientPred]);

patientCM = confusionmat( ...
    categorical(patientTrue, allClasses), ...
    categorical(patientPred, allClasses));

figure('Name','Patient Level Confusion Matrix','Color','w');
confusionchart(patientCM, cellstr(allClasses));
title('Patient-Level Prediction');

% ----------------------------------------------------
% Results table
% ----------------------------------------------------

patientTable = table( ...
    uniquePatients, ...
    patientCycleCount, ...
    categorical(patientTrue, allClasses), ...
    categorical(patientPred, allClasses), ...
    'VariableNames', ...
    {'PatientID','CycleCount','TrueLabel','PredictedLabel'});

disp(patientTable);

% ----------------------------------------------------
% Save results to returned structure
% ----------------------------------------------------

patientResults.Available = true;
patientResults.PatientTable = patientTable;
patientResults.ConfusionMatrix = patientCM;
patientResults.PatientAccuracy = patientAccuracy;
patientResults.NumPatients = numPatients;

fprintf('\nPatient-level evaluation complete.\n');

end