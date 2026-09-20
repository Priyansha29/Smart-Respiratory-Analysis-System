function part4 = runPart4( ...
    XTrain,YTrain,XTest,YTest)

% ============================================================
% PART 4
% MACHINE LEARNING ENGINE
% ============================================================

fprintf('\n');
fprintf('====================================================\n');
fprintf('              PART 4 - MACHINE LEARNING\n');
fprintf('====================================================\n');

rng(42);

% ============================================================
% STEP 1 — PREPARE DATA
% ============================================================

data = prepareMLData( ...
    XTrain,YTrain,XTest,YTest);

XTrain = data.XTrain;
YTrain = data.YTrain;

XTest = data.XTest;
YTest = data.YTest;

% ============================================================
% STEP 2 — TRAIN SVM
% ============================================================

tic;

svmModel = ...
    trainSVM(XTrain,YTrain);

svmTrainingTime = toc;

% ============================================================
% STEP 3 — TRAIN RANDOM FOREST
% ============================================================

tic;

rfModel = ...
    trainRandomForest(XTrain,YTrain);

rfTrainingTime = toc;

% ============================================================
% STEP 4 — TRAIN KNN
% ============================================================

tic;

knnModel = ...
    trainKNN(XTrain,YTrain);

knnTrainingTime = toc;

% ============================================================
% STEP 5 — TRAIN FEATURE ENSEMBLE
% ============================================================

tic;

ensembleModel = ...
    trainEnsemble(XTrain,YTrain);

ensembleTrainingTime = toc;

% ============================================================
% STEP 6 — EVALUATE SVM
% ============================================================

svmResults = evaluateModel( ...
    svmModel, ...
    XTest, ...
    YTest, ...
    'SVM');

% ============================================================
% STEP 7 — EVALUATE RANDOM FOREST
% ============================================================

rfResults = evaluateModel( ...
    rfModel, ...
    XTest, ...
    YTest, ...
    'Random Forest');

% ============================================================
% STEP 8 — EVALUATE KNN
% ============================================================

knnResults = evaluateModel( ...
    knnModel, ...
    XTest, ...
    YTest, ...
    'KNN');

% ============================================================
% STEP 9 — EVALUATE ENSEMBLE
% ============================================================

ensembleResults = evaluateModel( ...
    ensembleModel, ...
    XTest, ...
    YTest, ...
    'Feature Ensemble');

% ============================================================
% STEP 10 — COMPARE MODELS
% ============================================================

comparison = compareModels( ...
    svmResults, ...
    rfResults, ...
    knnResults, ...
    ensembleResults);

% ============================================================
% STORE MODELS
% ============================================================

part4.SVM.Model = svmModel;
part4.SVM.Results = svmResults;
part4.SVM.TrainingTime = svmTrainingTime;

part4.RandomForest.Model = rfModel;
part4.RandomForest.Results = rfResults;
part4.RandomForest.TrainingTime = rfTrainingTime;

part4.KNN.Model = knnModel;
part4.KNN.Results = knnResults;
part4.KNN.TrainingTime = knnTrainingTime;

part4.Ensemble.Model = ensembleModel;
part4.Ensemble.Results = ensembleResults;
part4.Ensemble.TrainingTime = ensembleTrainingTime;

part4.Comparison = comparison;

part4.Data = data;

% ============================================================
% SAVE EVERYTHING
% ============================================================

save( ...
    'Part4_TrainedModels.mat', ...
    'part4', ...
    '-v7.3');

fprintf('\n');
fprintf('====================================================\n');
fprintf('PART 4 COMPLETE\n');
fprintf('====================================================\n');

fprintf('\nModels saved to:\n');
fprintf('Part4_TrainedModels.mat\n');

end