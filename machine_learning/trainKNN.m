function model = trainKNN(XTrain,YTrain)

% ============================================================
% K-NEAREST NEIGHBOR CLASSIFIER
% ============================================================

fprintf('\n');
fprintf('============================================\n');
fprintf('TRAINING KNN\n');
fprintf('============================================\n');

numNeighbors = 7;

model = fitcknn( ...
    XTrain, ...
    YTrain, ...
    'NumNeighbors',numNeighbors, ...
    'Distance','euclidean', ...
    'DistanceWeight','squaredinverse', ...
    'Standardize',false, ...
    'Prior','uniform');

fprintf('KNN training completed.\n');
fprintf('Number of neighbors: %d\n',numNeighbors);

end