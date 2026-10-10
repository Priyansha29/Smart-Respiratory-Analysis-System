function ctx = inferenceInit(projectRoot)
%INFERENCEINIT  Load the trained artifacts once for the inference worker.
%
%   Reuses the completed Part 4 (models + saved preprocessing parameters)
%   and Part 5 (PCA / confidence) artifacts. It never retrains models and
%   never rebuilds the research feature matrix.
%
%   ctx = INFERENCEINIT()          uses the parent of this file's folder
%   ctx = INFERENCEINIT(projectRoot)
%
%   The returned struct is JSON-agnostic and is kept in memory by
%   inferenceWorker.m so that expensive loading happens exactly once.

if nargin < 1 || isempty(projectRoot)
    thisDir = fileparts(mfilename('fullpath'));
    projectRoot = fileparts(thisDir);
end

ctx = struct();
ctx.projectRoot   = projectRoot;
ctx.matlabVersion = version;
ctx.generatedAt   = datestr(now, 'yyyy-mm-ddTHH:MM:SS');

% ---- research functions on the path (unmodified) ------------------------
addpath(projectRoot);
addpath(fullfile(projectRoot, 'preprocessing'));
addpath(fullfile(projectRoot, 'segmentation'));
addpath(fullfile(projectRoot, 'features'));
addpath(fullfile(projectRoot, 'machine_learning'));
addpath(fullfile(projectRoot, 'analysis'));
addpath(fullfile(projectRoot, 'inference'));

% ---- Part 4: models + saved preprocessing parameters --------------------
modelFile = fullfile(projectRoot, 'Part4_TrainedModels.mat');
if ~isfile(modelFile)
    error('inference:missingModel', ...
        'Part 4 model artifact not found: %s', modelFile);
end
S = load(modelFile, 'part4');
p = S.part4;

ctx.modelFile      = modelFile;
ctx.maskFeatures   = logical(p.Data.ValidFeatures(:)');   % pre-variance mask (101)
ctx.maskVariance   = logical(p.Data.ValidVariance(:)');   % post mask (101 -> 100)
ctx.featureMeans   = double(p.Data.FeatureMeans(:)');
ctx.featureStd     = double(p.Data.FeatureStd(:)');
ctx.ytrainClasses  = string(categories(p.Data.YTrain));

ctx.models = struct( ...
    'SVM',          p.SVM.Model, ...
    'RandomForest', p.RandomForest.Model, ...
    'KNN',          p.KNN.Model, ...
    'Ensemble',     p.Ensemble.Model);
ctx.modelNames = {'SVM', 'RandomForest', 'KNN', 'Ensemble'};
ctx.ensembleClassNames = string(p.Ensemble.Model.ClassNames(:)');

% ---- dataset-level evaluation metrics (real, held-out test set) ---------
comp = p.Comparison;
ctx.comparison = struct( ...
    'Model',            string(comp.Model), ...
    'Accuracy',         double(comp.Accuracy), ...
    'BalancedAccuracy', double(comp.BalancedAccuracy), ...
    'MacroPrecision',   double(comp.MacroPrecision), ...
    'MacroRecall',      double(comp.MacroRecall), ...
    'MacroF1',          double(comp.MacroF1));

ctx.confusion = struct();
for i = 1:numel(ctx.modelNames)
    nm = ctx.modelNames{i};
    r  = p.(nm).Results;
    ctx.confusion.(nm) = struct( ...
        'matrix',     double(r.ConfusionMatrix), ...
        'classNames', string(r.ClassNames(:)'));
end

% ---- canonical 101 feature names & order (from the research extractor) --
rng(0);
synthetic = randn(8192, 1);
[~, names101] = extractAllFeatures(synthetic, 44100);
ctx.featureNames101 = string(names101(:)');
if numel(ctx.featureNames101) ~= 101
    error('inference:featureMismatch', ...
        'Expected 101 features from extractAllFeatures, got %d.', ...
        numel(ctx.featureNames101));
end
n1 = ctx.featureNames101(ctx.maskFeatures);
ctx.featureNames = n1(ctx.maskVariance);      % 100 names actually modelled

% Feature groups follow the fixed order produced by extractAllFeatures:
% time(14), frequency(14), stft(9), mfcc(52), wavelet(12) = 101.
% Derive boundaries from the actual names to stay robust.
group101 = strings(1, 101);
isMFCC    = startsWith(ctx.featureNames101, "MFCC");
isWavelet = startsWith(ctx.featureNames101, "Wavelet");
group101(isMFCC)    = "mfcc";
group101(isWavelet) = "wavelet";
firstMFCC = find(isMFCC, 1);
group101(firstMFCC-9:firstMFCC-1) = "stft";      % 9 STFT features precede MFCC
rest = find(group101 == "");
assert(numel(rest) == 28, 'Expected 28 time/frequency features, got %d.', numel(rest));
group101(rest(1:14))  = "time";
group101(rest(15:28)) = "frequency";
assert(sum(isMFCC) == 52 && sum(isWavelet) == 12, 'Unexpected MFCC/wavelet feature counts.');
ctx.featureGroup101 = group101;
g1 = group101(ctx.maskFeatures);
ctx.featureGroups = g1(ctx.maskVariance);
ctx.yTrain = p.Data.YTrain;                    % for PCA class colouring

% ---- explainability: OOB predictor importance from the saved RF --------
try
    imp = predictorImportance(ctx.models.RandomForest);
    ctx.featureImportance = double(imp(:)');
catch
    ctx.featureImportance = [];
end

% ---- Part 5: PCA + confidence (optional, read-only) --------------------
ctx.pca = struct();
ctx.confidence = struct();
p5 = findPart5(projectRoot);
ctx.part5Path = p5;
if ~isempty(p5)
    try
        S5 = load(p5, 'part5');
        if isfield(S5, 'part5')
            p5s = S5.part5;
            if isfield(p5s, 'PCA') && isstruct(p5s.PCA) && ~isempty(fieldnames(p5s.PCA))
                ctx.pca = p5s.PCA;
            end
            if isfield(p5s, 'Confidence') && isstruct(p5s.Confidence)
                ctx.confidence = p5s.Confidence;
            end
        end
    catch
        % Part 5 is optional; PCA/confidence sections simply stay empty.
    end
end
ctx.hasPCA = isstruct(ctx.pca) && isfield(ctx.pca, 'Scores') && ~isempty(ctx.pca.Scores);

% ---- report the sample rates seen in training sources (documentation) ---
ctx.note = [ ...
    'MATLAB inference adapter. Models loaded from Part4_TrainedModels.mat. ' ...
    'Training used each ICBHI recording''s native sampling rate ' ...
    '(mixed 44100/4000/10000 Hz); inference likewise uses the upload''s ' ...
    'native rate and does NOT resample, matching training behaviour. ' ...
    'Uploads have no ICBHI annotations, so cycles are found with an ' ...
    'automatic energy-based segmenter (approximate).'];
end

% ------------------------------------------------------------------------
function p5 = findPart5(projectRoot)
p5 = '';
candidates = { ...
    fullfile(projectRoot, 'Part5_AdvancedAnalysis.mat'), ...
    fullfile(tempdir, 'Editor_mnstu', 'Part5_AdvancedAnalysis.mat')};
for i = 1:numel(candidates)
    if isfile(candidates{i})
        p5 = candidates{i};
        return;
    end
end
d = dir(fullfile(tempdir, 'Editor_*', 'Part5_AdvancedAnalysis.mat'));
if ~isempty(d)
    p5 = fullfile(d(1).folder, d(1).name);
end
end
