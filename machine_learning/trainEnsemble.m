function model = trainEnsemble(XTrain,YTrain)

fprintf('\n============================================\n');
fprintf('TRAINING ENSEMBLE MODEL\n');
fprintf('============================================\n');

numTrees = 100;

% Use bagged decision trees
% This is compatible with classification trees in MATLAB
treeTemplate = templateTree('MaxNumSplits',30);

model = fitcensemble( ...
    XTrain, ...
    YTrain, ...
    'Method','Bag', ...
    'Learners',treeTemplate, ...
    'NumLearningCycles',numTrees, ...
    'Prior','uniform');

fprintf('Ensemble training completed.\n');
fprintf('Number of trees: %d\n',numTrees);

end