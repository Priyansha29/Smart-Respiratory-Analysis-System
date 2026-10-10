function importance = analyzeFeatureImportance(model,XTrain,YTrain,featureNames)

fprintf('\n====================================================\n');
fprintf('PART 5.1 - FEATURE IMPORTANCE ANALYSIS\n');
fprintf('====================================================\n');

% Number of features
numFeatures = size(XTrain,2);

% Ensure feature names exist
if nargin < 4 || isempty(featureNames)
    featureNames = "Feature_" + string(1:numFeatures);
else
    featureNames = string(featureNames(:));
    
    % Make sure number of names matches number of features
    if length(featureNames) ~= numFeatures
        featureNames = "Feature_" + string(1:numFeatures);
    end
end

% ----------------------------------------------------
% Try MATLAB's built-in predictor importance
% ----------------------------------------------------

importanceValues = [];

try
    importanceValues = predictorImportance(model);
catch
    fprintf('Built-in predictor importance unavailable for this model.\n');
end

% ----------------------------------------------------
% If unavailable, use permutation importance
% ----------------------------------------------------

if isempty(importanceValues)

    fprintf('Using permutation-based feature importance...\n');

    [baselinePred,~] = predict(model,XTrain);

    baselineAccuracy = mean(baselinePred == YTrain);

    numFeaturesToTest = numFeatures;

    importanceValues = zeros(numFeaturesToTest,1);

    rng(42);

    for j = 1:numFeaturesToTest

        XPerm = XTrain;

        randomOrder = randperm(size(XTrain,1));

        XPerm(:,j) = XPerm(randomOrder,j);

        permPred = predict(model,XPerm);

        permAccuracy = mean(permPred == YTrain);

        importanceValues(j) = baselineAccuracy - permAccuracy;

    end
end

importanceValues = importanceValues(:);

% ----------------------------------------------------
% Sort features
% ----------------------------------------------------

[sortedImportance,sortIndex] = sort(importanceValues,'descend');

sortedNames = featureNames(sortIndex);

% Top 20
numTop = min(20,length(sortedImportance));

topImportance = sortedImportance(1:numTop);
topNames = sortedNames(1:numTop);

fprintf('\nTOP FEATURES\n');
fprintf('--------------------------------------------\n');

for i = 1:numTop
    fprintf('%2d. %-35s %.6f\n', ...
        i,topNames(i),topImportance(i));
end

% ----------------------------------------------------
% Plot
% ----------------------------------------------------

figure('Name','Top Feature Importance','Color','w');

barh(topImportance(end:-1:1));

set(gca, ...
    'YTick',1:numTop, ...
    'YTickLabel',cellstr(topNames(end:-1:1)));

xlabel('Importance');
ylabel('Feature');
title('Top 20 Most Important Features');
grid on;

% ----------------------------------------------------
% Save results
% ----------------------------------------------------

importance.FeatureNames = featureNames;
importance.ImportanceValues = importanceValues;
importance.SortedNames = sortedNames;
importance.SortedImportance = sortedImportance;
importance.TopNames = topNames;
importance.TopImportance = topImportance;

fprintf('\nFeature importance analysis complete.\n');

end