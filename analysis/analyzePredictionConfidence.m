function confidence = analyzePredictionConfidence(model,XTest,YTest,modelName)

fprintf('\n====================================================\n');
fprintf('PART 5.3 - PREDICTION CONFIDENCE ANALYSIS\n');
fprintf('====================================================\n');

[YPred,scores] = predict(model,XTest);

scores = double(scores);

% ----------------------------------------------------
% Convert scores to confidence
% ----------------------------------------------------

if isempty(scores)

    confidenceValues = NaN(size(YPred));

else

    % For each sample, take highest model score
    maxScores = max(scores,[],2);

    % Softmax-like normalization
    expScores = exp(scores - max(scores,[],2));

    probabilities = expScores ./ sum(expScores,2);

    confidenceValues = max(probabilities,[],2);

end

% ----------------------------------------------------
% Correct / incorrect confidence
% ----------------------------------------------------

correct = YPred == YTest;

meanConfidence = mean(confidenceValues,'omitnan');

correctConfidence = mean( ...
    confidenceValues(correct), ...
    'omitnan');

incorrectConfidence = mean( ...
    confidenceValues(~correct), ...
    'omitnan');

fprintf('\nMODEL: %s\n',modelName);

fprintf('Mean confidence        : %.2f %%\n', ...
    meanConfidence*100);

fprintf('Correct prediction conf: %.2f %%\n', ...
    correctConfidence*100);

fprintf('Incorrect prediction conf: %.2f %%\n', ...
    incorrectConfidence*100);

% ----------------------------------------------------
% Confidence distribution
% ----------------------------------------------------

figure( ...
    'Name',[modelName ' - Prediction Confidence'], ...
    'Color','w');

histogram(confidenceValues,20);

xlabel('Prediction Confidence');

ylabel('Number of Respiratory Cycles');

title([modelName ' - Confidence Distribution']);

grid on;

% ----------------------------------------------------
% Confidence vs correctness
% ----------------------------------------------------

figure( ...
    'Name',[modelName ' - Confidence vs Correctness'], ...
    'Color','w');

boxchart( ...
    categorical(correct, ...
    [false true], ...
    {'Incorrect','Correct'}), ...
    confidenceValues);

ylabel('Prediction Confidence');

title([modelName ' - Confidence vs Prediction Correctness']);

grid on;

% ----------------------------------------------------
% Save
% ----------------------------------------------------

confidence.ModelName = modelName;
confidence.PredictedLabels = YPred;
confidence.Scores = scores;
confidence.Confidence = confidenceValues;
confidence.Correct = correct;
confidence.MeanConfidence = meanConfidence;
confidence.CorrectConfidence = correctConfidence;
confidence.IncorrectConfidence = incorrectConfidence;

fprintf('\nConfidence analysis complete.\n');

end