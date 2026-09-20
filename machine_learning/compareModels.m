function comparison = compareModels(resultsSVM, ...
    resultsRF,resultsKNN,resultsEnsemble)

% ============================================================
% MODEL COMPARISON
% ============================================================

fprintf('\n');
fprintf('============================================\n');
fprintf('MODEL COMPARISON\n');
fprintf('============================================\n');

Model = {
    'SVM'
    'Random Forest'
    'KNN'
    'Feature Ensemble'
    };

Accuracy = [
    resultsSVM.Accuracy
    resultsRF.Accuracy
    resultsKNN.Accuracy
    resultsEnsemble.Accuracy
    ];

BalancedAccuracy = [
    resultsSVM.BalancedAccuracy
    resultsRF.BalancedAccuracy
    resultsKNN.BalancedAccuracy
    resultsEnsemble.BalancedAccuracy
    ];

MacroPrecision = [
    resultsSVM.Precision
    resultsRF.Precision
    resultsKNN.Precision
    resultsEnsemble.Precision
    ];

MacroRecall = [
    resultsSVM.Recall
    resultsRF.Recall
    resultsKNN.Recall
    resultsEnsemble.Recall
    ];

MacroF1 = [
    resultsSVM.F1
    resultsRF.F1
    resultsKNN.F1
    resultsEnsemble.F1
    ];

comparison = table( ...
    Model, ...
    Accuracy, ...
    BalancedAccuracy, ...
    MacroPrecision, ...
    MacroRecall, ...
    MacroF1);

% ------------------------------------------------------------
% Display percentage metrics
% ------------------------------------------------------------

displayTable = comparison;

displayTable.Accuracy = ...
    displayTable.Accuracy*100;

displayTable.BalancedAccuracy = ...
    displayTable.BalancedAccuracy*100;

disp(displayTable);

% ------------------------------------------------------------
% Accuracy comparison
% ------------------------------------------------------------

figure( ...
    'Name','Model Accuracy Comparison', ...
    'Color','w');

bar( ...
    comparison.Accuracy*100);

set(gca, ...
    'XTick',1:height(comparison), ...
    'XTickLabel',comparison.Model);

ylabel('Accuracy (%)');

xlabel('Model');

title('Model Accuracy Comparison');

grid on;

% ------------------------------------------------------------
% Balanced accuracy comparison
% ------------------------------------------------------------

figure( ...
    'Name','Balanced Accuracy Comparison', ...
    'Color','w');

bar( ...
    comparison.BalancedAccuracy*100);

set(gca, ...
    'XTick',1:height(comparison), ...
    'XTickLabel',comparison.Model);

ylabel('Balanced Accuracy (%)');

xlabel('Model');

title('Balanced Accuracy Comparison');

grid on;

% ------------------------------------------------------------
% Macro F1 comparison
% ------------------------------------------------------------

figure( ...
    'Name','Macro F1 Comparison', ...
    'Color','w');

bar( ...
    comparison.MacroF1);

set(gca, ...
    'XTick',1:height(comparison), ...
    'XTickLabel',comparison.Model);

ylabel('Macro F1 Score');

xlabel('Model');

title('Macro F1 Comparison');

grid on;

fprintf('\nModel comparison complete.\n');

end