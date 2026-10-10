function part5 = runPart5( ...
    part4, ...
    XTrain, ...
    YTrain, ...
    XTest, ...
    YTest, ...
    testMetadata, ...
    featureNames)

fprintf('\n');
fprintf('============================================================\n');
fprintf('              PART 5 - ADVANCED ANALYSIS\n');
fprintf('============================================================\n');

rng(42);

% ============================================================
% EXTRACT DATA
% ============================================================

fprintf('\nLoading Part 4 trained models...\n');

svmModel = part4.SVM.Model;
rfModel = part4.RandomForest.Model;
knnModel = part4.KNN.Model;
ensembleModel = part4.Ensemble.Model;

% ============================================================
% FEATURE IMPORTANCE
% ============================================================

fprintf('\nRunning feature importance analysis...\n');

% Random Forest is used because tree-based models provide
% interpretable predictor importance.

try

    featureImportance = analyzeFeatureImportance( ...
        rfModel, ...
        XTrain, ...
        YTrain, ...
        featureNames);

catch ME

    fprintf('\nFeature importance analysis failed:\n');
    fprintf('%s\n',ME.message);

    featureImportance = struct();

end

% ============================================================
% PCA
% ============================================================

fprintf('\nRunning PCA analysis...\n');

try

    pcaResults = visualizePCA( ...
        XTrain, ...
        YTrain);

catch ME

    fprintf('\nPCA analysis failed:\n');
    fprintf('%s\n',ME.message);

    pcaResults = struct();

end

% ============================================================
% CONFIDENCE ANALYSIS
% ============================================================

fprintf('\nRunning confidence analysis for SVM...\n');

try

    svmConfidence = analyzePredictionConfidence( ...
        svmModel, ...
        XTest, ...
        YTest, ...
        'SVM');

catch ME

    fprintf('\nSVM confidence analysis failed:\n');
    fprintf('%s\n',ME.message);

    svmConfidence = struct();

end


fprintf('\nRunning confidence analysis for Random Forest...\n');

try

    rfConfidence = analyzePredictionConfidence( ...
        rfModel, ...
        XTest, ...
        YTest, ...
        'Random Forest');

catch ME

    fprintf('\nRandom Forest confidence analysis failed:\n');
    fprintf('%s\n',ME.message);

    rfConfidence = struct();

end


fprintf('\nRunning confidence analysis for KNN...\n');

try

    knnConfidence = analyzePredictionConfidence( ...
        knnModel, ...
        XTest, ...
        YTest, ...
        'KNN');

catch ME

    fprintf('\nKNN confidence analysis failed:\n');
    fprintf('%s\n',ME.message);

    knnConfidence = struct();

end


fprintf('\nRunning confidence analysis for Ensemble...\n');

try

    ensembleConfidence = analyzePredictionConfidence( ...
        ensembleModel, ...
        XTest, ...
        YTest, ...
        'Feature Ensemble');

catch ME

    fprintf('\nEnsemble confidence analysis failed:\n');
    fprintf('%s\n',ME.message);

    ensembleConfidence = struct();

end

% ============================================================
% PATIENT LEVEL ANALYSIS
% ============================================================

fprintf('\nRunning patient-level analysis...\n');

try

    patientResults = patientLevelEvaluation( ...
        ensembleModel, ...
        XTest, ...
        YTest, ...
        testMetadata);

catch ME

    fprintf('\nPatient-level evaluation failed:\n');
    fprintf('%s\n',ME.message);

    patientResults = struct();

end

% ============================================================
% STORE RESULTS
% ============================================================

part5.FeatureImportance = featureImportance;

part5.PCA = pcaResults;

part5.Confidence.SVM = svmConfidence;
part5.Confidence.RandomForest = rfConfidence;
part5.Confidence.KNN = knnConfidence;
part5.Confidence.Ensemble = ensembleConfidence;

part5.PatientLevel = patientResults;

% ============================================================
% SAVE
% ============================================================

save( ...
    'Part5_AdvancedAnalysis.mat', ...
    'part5', ...
    '-v7.3');

fprintf('\n');
fprintf('============================================================\n');
fprintf('              PART 5 COMPLETE\n');
fprintf('============================================================\n');

fprintf('\nSaved file:\n');
fprintf('Part5_AdvancedAnalysis.mat\n');

end