function analyzeFeatureDataset(X,Y)

% ============================================================
% FEATURE DATASET ANALYSIS
% ============================================================

fprintf('\n');
fprintf('============================================\n');
fprintf('FEATURE DATASET ANALYSIS\n');
fprintf('============================================\n');

% ------------------------------------------------------------
% Basic dimensions
% ------------------------------------------------------------

fprintf('Samples  : %d\n',size(X,1));
fprintf('Features : %d\n',size(X,2));

% ------------------------------------------------------------
% Missing values
% ------------------------------------------------------------

missingValues = sum(isnan(X),'all');

infiniteValues = sum(isinf(X),'all');

fprintf('\nMissing values   : %d\n',missingValues);
fprintf('Infinite values  : %d\n',infiniteValues);

% ------------------------------------------------------------
% Class distribution
% ------------------------------------------------------------

classes = categories(Y);

fprintf('\nClass distribution:\n');

for k = 1:length(classes)

    count = sum(Y == classes{k});

    percentage = ...
        100 * count / length(Y);

    fprintf( ...
        '%-20s %6d samples (%6.2f%%)\n', ...
        classes{k}, ...
        count, ...
        percentage);

end

% ------------------------------------------------------------
% Plot class distribution
% ------------------------------------------------------------

figure('Name','Respiratory Cycle Class Distribution');

histogram(Y);

xlabel('Respiratory Sound Class');
ylabel('Number of Cycles');

title('ICBHI Respiratory Cycle Class Distribution');

grid on;

end