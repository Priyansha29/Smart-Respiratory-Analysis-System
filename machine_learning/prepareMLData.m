function data = prepareMLData(XTrain,YTrain,XTest,YTest)

% ============================================================
% PREPARE MACHINE LEARNING DATA
% ============================================================

fprintf('\n');
fprintf('============================================\n');
fprintf('PREPARING MACHINE LEARNING DATA\n');
fprintf('============================================\n');

% ------------------------------------------------------------
% Convert labels to categorical
% ------------------------------------------------------------

if ~iscategorical(YTrain)
    YTrain = categorical(YTrain);
end

if ~iscategorical(YTest)
    YTest = categorical(YTest);
end

% ------------------------------------------------------------
% Convert X to double
% ------------------------------------------------------------

XTrain = double(XTrain);
XTest = double(XTest);

% ------------------------------------------------------------
% Replace Inf with NaN
% ------------------------------------------------------------

XTrain(~isfinite(XTrain)) = NaN;
XTest(~isfinite(XTest)) = NaN;

% ------------------------------------------------------------
% Remove features that contain NaN everywhere
% ------------------------------------------------------------

validFeatures = ...
    ~all(isnan(XTrain),1);

XTrain = XTrain(:,validFeatures);
XTest = XTest(:,validFeatures);

% ------------------------------------------------------------
% Calculate training feature means
% IMPORTANT:
% Only TRAINING data is used here.
% ------------------------------------------------------------

featureMeans = ...
    mean(XTrain,1,'omitnan');

% Replace remaining NaNs using training means
% ------------------------------------------------------------

for j = 1:size(XTrain,2)

    trainMissing = isnan(XTrain(:,j));
    testMissing = isnan(XTest(:,j));

    XTrain(trainMissing,j) = ...
        featureMeans(j);

    XTest(testMissing,j) = ...
        featureMeans(j);

end

% ------------------------------------------------------------
% Remove zero-variance features
% ------------------------------------------------------------

featureStd = std(XTrain,0,1);

validVariance = ...
    featureStd > 1e-12 & ...
    isfinite(featureStd);

XTrain = XTrain(:,validVariance);
XTest = XTest(:,validVariance);

% Recalculate statistics
featureMeans = mean(XTrain,1);
featureStd = std(XTrain,0,1);

featureStd(featureStd < 1e-12) = 1;

% ------------------------------------------------------------
% STANDARDIZATION
%
% z = (x - mean) / standard deviation
%
% Parameters are learned ONLY from training data.
% ------------------------------------------------------------

XTrainScaled = ...
    (XTrain - featureMeans) ./ featureStd;

XTestScaled = ...
    (XTest - featureMeans) ./ featureStd;

% ------------------------------------------------------------
% Store everything
% ------------------------------------------------------------

data.XTrain = XTrainScaled;
data.YTrain = YTrain;

data.XTest = XTestScaled;
data.YTest = YTest;

data.FeatureMeans = featureMeans;
data.FeatureStd = featureStd;

data.ValidFeatures = validFeatures;
data.ValidVariance = validVariance;

% ------------------------------------------------------------
% Print information
% ------------------------------------------------------------

fprintf('Training samples : %d\n',size(XTrainScaled,1));
fprintf('Testing samples  : %d\n',size(XTestScaled,1));

fprintf('Features used    : %d\n',size(XTrainScaled,2));

fprintf('\nTraining classes:\n');

disp(countcats(YTrain));

fprintf('Testing classes:\n');

disp(countcats(YTest));

fprintf('Data preparation complete.\n');

end