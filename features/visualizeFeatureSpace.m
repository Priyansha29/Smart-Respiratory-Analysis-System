function [XReduced,explained,coeff,score] = ...
    visualizeFeatureSpace(X,Y)

% ============================================================
% PCA FEATURE SPACE VISUALIZATION
% ============================================================

fprintf('\n');
fprintf('============================================\n');
fprintf('PCA FEATURE ANALYSIS\n');
fprintf('============================================\n');

% ------------------------------------------------------------
% Clean data
% ------------------------------------------------------------

X = double(X);

X(~isfinite(X)) = 0;

% ------------------------------------------------------------
% Standardize features
% ------------------------------------------------------------

XStandardized = zscore(X);

% Replace any remaining NaN
XStandardized(~isfinite(XStandardized)) = 0;

% ------------------------------------------------------------
% PCA
% ------------------------------------------------------------

[coeff,score,~,~,explained] = ...
    pca(XStandardized);

% ------------------------------------------------------------
% Number of components
% ------------------------------------------------------------

cumulativeVariance = cumsum(explained);

nComponents = ...
    find(cumulativeVariance >= 95,1);

if isempty(nComponents)

    nComponents = size(score,2);

end

XReduced = ...
    score(:,1:nComponents);

fprintf('Components required for 95%% variance: %d\n', ...
    nComponents);

fprintf('\nFirst 10 principal components:\n');

for k = 1:min(10,length(explained))

    fprintf( ...
        'PC%02d : %6.2f%%\n', ...
        k, ...
        explained(k));

end

% ------------------------------------------------------------
% Cumulative variance plot
% ------------------------------------------------------------

figure('Name','PCA Explained Variance');

plot( ...
    1:length(cumulativeVariance), ...
    cumulativeVariance, ...
    'LineWidth',2);

xlabel('Principal Component');

ylabel('Cumulative Explained Variance (%)');

title('PCA Explained Variance');

grid on;

yline(95,'--');

% ------------------------------------------------------------
% 2D PCA visualization
% ------------------------------------------------------------

figure('Name','Respiratory Sound PCA');

gscatter( ...
    score(:,1), ...
    score(:,2), ...
    Y);

xlabel('Principal Component 1');

ylabel('Principal Component 2');

title('Respiratory Sound Feature Space');

grid on;

end