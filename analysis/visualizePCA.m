function pcaResults = visualizePCA(XTrain,YTrain)

fprintf('\n====================================================\n');
fprintf('PART 5.2 - PCA FEATURE SPACE ANALYSIS\n');
fprintf('====================================================\n');

XTrain = double(XTrain);

% Remove invalid values
XTrain(~isfinite(XTrain)) = 0;

% ----------------------------------------------------
% PCA
% ----------------------------------------------------

[coeff,score,latent,~,explained,mu] = pca(XTrain);

% Cumulative explained variance
cumulativeVariance = cumsum(explained);

fprintf('\nPCA RESULTS\n');
fprintf('--------------------------------------------\n');

fprintf('PC1 variance explained : %.2f %%\n',explained(1));

if length(explained) >= 2
    fprintf('PC2 variance explained : %.2f %%\n',explained(2));
end

if length(explained) >= 3
    fprintf('PC3 variance explained : %.2f %%\n',explained(3));
end

% Number of components required for 95%
components95 = find(cumulativeVariance >= 95,1);

fprintf('Components for 95%% variance : %d\n',components95);

% ----------------------------------------------------
% 2D PCA
% ----------------------------------------------------

figure('Name','PCA Feature Space 2D','Color','w');

gscatter( ...
    score(:,1), ...
    score(:,2), ...
    YTrain);

xlabel(sprintf('PC1 (%.2f%%)',explained(1)));
ylabel(sprintf('PC2 (%.2f%%)',explained(2)));

title('Respiratory Sound Feature Space - PCA');

grid on;

legend('Location','best');

% ----------------------------------------------------
% 3D PCA
% ----------------------------------------------------

if size(score,2) >= 3

    figure('Name','PCA Feature Space 3D','Color','w');

    scatter3( ...
        score(:,1), ...
        score(:,2), ...
        score(:,3), ...
        15, ...
        double(YTrain), ...
        'filled');

    xlabel(sprintf('PC1 (%.2f%%)',explained(1)));
    ylabel(sprintf('PC2 (%.2f%%)',explained(2)));
    zlabel(sprintf('PC3 (%.2f%%)',explained(3)));

    title('Respiratory Sound Feature Space - 3D PCA');

    grid on;
    view(45,30);

end

% ----------------------------------------------------
% Explained variance plot
% ----------------------------------------------------

figure('Name','PCA Explained Variance','Color','w');

plot(cumulativeVariance,'-o','LineWidth',1.5);

yline(95,'--');

xlabel('Number of Principal Components');
ylabel('Cumulative Explained Variance (%)');

title('PCA Cumulative Explained Variance');

grid on;

% ----------------------------------------------------
% Save
% ----------------------------------------------------

pcaResults.Coefficients = coeff;
pcaResults.Scores = score;
pcaResults.Latent = latent;
pcaResults.Explained = explained;
pcaResults.CumulativeVariance = cumulativeVariance;
pcaResults.Mean = mu;
pcaResults.Components95 = components95;

fprintf('\nPCA analysis complete.\n');

end