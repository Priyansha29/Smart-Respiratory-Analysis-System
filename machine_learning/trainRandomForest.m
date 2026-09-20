function model = trainRandomForest(XTrain,YTrain)

% ============================================================
% RANDOM FOREST / BAGGED DECISION TREES
% ============================================================

fprintf('\n');
fprintf('============================================\n');
fprintf('TRAINING RANDOM FOREST\n');
fprintf('============================================\n');

% Number of trees
numTrees = 150;

% Create tree template
treeTemplate = templateTree( ...
    'MaxNumSplits',50);

% Train bagged ensemble
model = fitcensemble( ...
    XTrain, ...
    YTrain, ...
    'Method','Bag', ...
    'Learners',treeTemplate, ...
    'NumLearningCycles',numTrees, ...
    'Prior','uniform');

fprintf('Random Forest training completed.\n');
fprintf('Number of trees: %d\n',numTrees);

end