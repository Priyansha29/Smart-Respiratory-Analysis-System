function results = evaluateModel(model,XTest,YTest,modelName)

% ============================================================
% MODEL EVALUATION
% ============================================================

fprintf('\n');
fprintf('============================================\n');
fprintf('%s - EVALUATION\n',upper(modelName));
fprintf('============================================\n');

% ------------------------------------------------------------
% Predictions
% ------------------------------------------------------------

[YPred,scores] = predict(model,XTest);

if ~iscategorical(YPred)
    YPred = categorical(YPred);
end

if ~iscategorical(YTest)
    YTest = categorical(YTest);
end

% ------------------------------------------------------------
% Class names
% ------------------------------------------------------------

classNames = categories(YTest);

% Make sure prediction categories are included
allClasses = union( ...
    categories(YTest), ...
    categories(YPred));

classNames = allClasses;

% ------------------------------------------------------------
% Confusion matrix
% ------------------------------------------------------------

CM = confusionmat( ...
    YTest, ...
    YPred, ...
    'Order',categorical(classNames));

numClasses = length(classNames);

% ------------------------------------------------------------
% Per-class metrics
% ------------------------------------------------------------

precision = zeros(numClasses,1);
recall = zeros(numClasses,1);
f1 = zeros(numClasses,1);

for i = 1:numClasses

    TP = CM(i,i);

    FP = sum(CM(:,i)) - TP;

    FN = sum(CM(i,:)) - TP;

    precision(i) = ...
        TP / (TP + FP + eps);

    recall(i) = ...
        TP / (TP + FN + eps);

    f1(i) = ...
        2 * precision(i) * recall(i) / ...
        (precision(i) + recall(i) + eps);

end

% ------------------------------------------------------------
% Accuracy
% ------------------------------------------------------------

accuracy = ...
    sum(diag(CM)) / sum(CM(:));

% ------------------------------------------------------------
% Balanced accuracy
% ------------------------------------------------------------

balancedAccuracy = mean(recall);

% ------------------------------------------------------------
% Macro metrics
% ------------------------------------------------------------

macroPrecision = mean(precision);

macroRecall = mean(recall);

macroF1 = mean(f1);

% ------------------------------------------------------------
% Display results
% ------------------------------------------------------------

fprintf('\nAccuracy          : %.2f %%\n', ...
    accuracy*100);

fprintf('Balanced Accuracy : %.2f %%\n', ...
    balancedAccuracy*100);

fprintf('Macro Precision   : %.4f\n', ...
    macroPrecision);

fprintf('Macro Recall      : %.4f\n', ...
    macroRecall);

fprintf('Macro F1          : %.4f\n', ...
    macroF1);

% ------------------------------------------------------------
% Per-class table
% ------------------------------------------------------------

classMetrics = table( ...
    categorical(classNames), ...
    precision, ...
    recall, ...
    f1, ...
    'VariableNames',{ ...
    'Class', ...
    'Precision', ...
    'Recall', ...
    'F1Score'});

disp(classMetrics);

% ------------------------------------------------------------
% Confusion matrix figure
% ------------------------------------------------------------

figure( ...
    'Name',[modelName ' - Confusion Matrix'], ...
    'Color','w');

confusionchart( ...
    CM, ...
    classNames);

title( ...
    sprintf('%s - Confusion Matrix',modelName));

% ------------------------------------------------------------
% Store results
% ------------------------------------------------------------

results.Name = modelName;

results.YPred = YPred;

results.Scores = scores;

results.ConfusionMatrix = CM;

results.ClassNames = classNames;

results.Accuracy = accuracy;

results.BalancedAccuracy = ...
    balancedAccuracy;

results.Precision = ...
    macroPrecision;

results.Recall = ...
    macroRecall;

results.F1 = ...
    macroF1;

results.ClassMetrics = ...
    classMetrics;

end