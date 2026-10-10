function result = analyzeRespiratoryRecording(audioPath, ctx, opts)
%ANALYZERESPIRATORYRECORDING  Real MATLAB inference for one uploaded WAV.
%
%   result = ANALYZERESPIRATORYRECORDING(audioPath)
%   result = ANALYZERESPIRATORYRECORDING(audioPath, ctx)
%   result = ANALYZERESPIRATORYRECORDING(audioPath, ctx, opts)
%
%   Loads an audio file, runs the SAME preprocessing and feature extraction
%   used in training, applies the saved Part 4 models, and returns a struct
%   that serialises (via jsonencode) to the dashboard AnalysisResult contract.
%
%   Everything that depends on the recording is computed from the actual
%   signal. Dataset-level evaluation numbers (model comparison, confusion
%   matrix, PCA cloud, predictor importance) come from the saved Part 4 /
%   Part 5 artifacts and are clearly dataset-level.
%
%   This file is NEW. It does not modify or replace any research function.

if nargin < 2 || isempty(ctx)
    ctx = inferenceInit();
end
if nargin < 3 || isempty(opts)
    opts = struct();
end
if ~isfield(opts, 'maxDurationSec'),       opts.maxDurationSec = 300; end
if ~isfield(opts, 'maxSegments'),          opts.maxSegments = 12; end
if ~isfield(opts, 'maxWaveformPoints'),    opts.maxWaveformPoints = 1400; end
if ~isfield(opts, 'maxSpectrogramFrames'), opts.maxSpectrogramFrames = 180; end
if ~isfield(opts, 'maxSpectrogramHz'),     opts.maxSpectrogramHz = 4000; end
if ~isfield(opts, 'maxSpectrogramBins'),   opts.maxSpectrogramBins = 96; end
if ~isfield(opts, 'maxMFCCCols'),          opts.maxMFCCCols = 120; end
if ~isfield(opts, 'maxPCAPoints'),         opts.maxPCAPoints = 60; end

audioPath = char(audioPath);
if ~isfile(audioPath)
    error('inference:missingAudio', 'Audio file not found: %s', audioPath);
end
info = audioinfo(audioPath);
Fs = double(info.SampleRate);
if ~isfinite(Fs) || Fs <= 0
    error('inference:badSampleRate', 'Invalid sample rate in audio file.');
end

x = audioread(audioPath);
x = double(x);
if size(x, 2) > 1
    x = mean(x, 2);
end
x = x(:);
if numel(x) < round(Fs * 0.2)
    error('inference:tooShort', 'Recording is too short to analyse (%.2f s).', ...
        numel(x) / Fs);
end
if numel(x) > opts.maxDurationSec * Fs
    x = x(1:round(opts.maxDurationSec * Fs));
end
x(~isfinite(x)) = 0;

[~, baseName, ~] = fileparts(audioPath);
if isfield(opts, 'displayName') && ~isempty(opts.displayName)
    fileName = char(opts.displayName);
else
    fileName = [baseName, '.wav'];
end

% ------------------------------------------------------------------ signal
filtered = preprocessSignal(x, Fs);        % exact training preprocessing
try
    denoised = waveletDenoise(x, Fs);      % same denoiser as the research code
catch
    denoised = filtered;
end
% the research denoiser opens a figure; close it so a long-running worker
% does not accumulate handles. Hide any accidental figures too.
try
    close(findobj('Type', 'figure')); %#ok<CLF>
catch
end

q        = struct(); qd = struct();
% Gain-invariant band-residual metrics (raw vs band-pass)
gx = (x - mean(x)) / (std(x) + eps);
gf = (filtered - mean(filtered)) / (std(filtered) + eps);
evalc('q = signalQualityMetrics(gx, gf);');
gd = (denoised - mean(denoised)) / (std(denoised) + eps);
evalc('qd = signalQualityMetrics(gf, gd);');
% genuine recording SNR from the quietest vs loudest 50 ms frames
snrDb    = estimateSNR(filtered, Fs);
duration = numel(x) / Fs;

% ------------------------------------------------------------- segmentation
segments = segmentRespiratorySignal(filtered, Fs, opts);

nAll = numel(segments);
segIdx = 1:nAll;
if nAll > opts.maxSegments
    segIdx = round(linspace(1, nAll, opts.maxSegments));
end

canonKeys   = ["normal", "crackle", "wheeze", "crackleWheeze"];
canonLabels = ["Normal", "Crackle", "Wheeze", "Crackle + Wheeze"];
nClasses    = numel(canonKeys);
ensNames    = ctx.ensembleClassNames;

colOf = zeros(1, nClasses);
for c = 1:nClasses
    for j = 1:numel(ensNames)
        if keyFromLabel(ensNames(j)) == canonKeys(c)
            colOf(c) = j;
        end
    end
end
if any(colOf == 0)
    error('inference:classMap', 'Could not map model class names to canonical classes.');
end

% ------------------------------------------------- per-segment feature pass
segScores  = zeros(0, nClasses);
segScaled  = zeros(0, numel(ctx.featureMeans));
segKeys    = strings(0, 1);
segStruct  = struct('index', {}, 'startSec', {}, 'endSec', {}, ...
                    'durationSec', {}, 'phase', {}, 'key', {}, ...
                    'confidence', {}, 'rawVec', {}, 'signal', {});
nValid = 0;

for s = segIdx
    a = max(1, floor(segments(s).startSec * Fs) + 1);
    b = min(numel(filtered), ceil(segments(s).endSec * Fs));
    if (b - a + 1) < 128
        continue;
    end
    cycleSignal = filtered(a:b);
    try
        [vec, ~] = extractAllFeatures(cycleSignal, Fs);
    catch
        continue;
    end
    vec = vec(:)';
    if numel(vec) ~= 101
        continue;
    end

    [scaled, canon] = predictCycle(ctx, vec, colOf);

    nValid = nValid + 1;
    segStruct(nValid).index       = segments(s).index;
    segStruct(nValid).startSec    = segments(s).startSec;
    segStruct(nValid).endSec      = segments(s).endSec;
    segStruct(nValid).durationSec = segments(s).durationSec;
    segStruct(nValid).phase       = segments(s).phase;
    [~, ci] = max(canon);
    segStruct(nValid).key        = canonKeys(ci);
    segStruct(nValid).confidence = canon(ci) * 100;
    segStruct(nValid).rawVec     = vec;
    segStruct(nValid).signal     = cycleSignal;

    segScores(end+1, :) = canon;  %#ok<AGROW>
    segScaled(end+1, :) = scaled; %#ok<AGROW>
    segKeys(end+1)      = canonKeys(ci); %#ok<AGROW>
end

fallbackWhole = false;
if nValid == 0
    try
        [vec, ~] = extractAllFeatures(filtered, Fs);
    catch ME
        error('inference:featureExtraction', ...
            'Feature extraction failed on this recording: %s', ME.message);
    end
    vec = vec(:)';
    if numel(vec) ~= 101
        error('inference:featureCount', 'Expected 101 features, got %d.', numel(vec));
    end
    [scaled, canon] = predictCycle(ctx, vec, colOf);
    [~, ci] = max(canon);
    nValid = 1;
    segStruct(1).index = 1;
    segStruct(1).startSec = 0;
    segStruct(1).endSec = duration;
    segStruct(1).durationSec = duration;
    segStruct(1).phase = 'Inspiration';
    segStruct(1).key = canonKeys(ci);
    segStruct(1).confidence = canon(ci) * 100;
    segStruct(1).rawVec = vec;
    segStruct(1).signal = filtered;
    segScores = canon;
    segScaled = scaled;
    segKeys = canonKeys(ci);
    fallbackWhole = true;
end

% ------------------------------------------------------------- aggregate
meanScores = mean(segScores, 1);
if sum(meanScores) > 0
    meanScores = meanScores / sum(meanScores);
end
[~, predIdx] = max(meanScores);
predKey   = canonKeys(predIdx);
predLabel = canonLabels(predIdx);
confidence = meanScores(predIdx) * 100;
agreementRate = mean(segKeys == predKey);

pScores = meanScores / (sum(meanScores) + eps);
H = -sum(pScores .* log(pScores + eps));
stability = 1 - H / log(nClasses);
stability = min(max(stability, 0), 1);

classAgreement = struct('label', {}, 'share', {});
for c = 1:nClasses
    classAgreement(c).label = char(canonLabels(c));
    classAgreement(c).share = mean(segKeys == canonKeys(c));
end

% ------------------------------------------------------------ prediction
result = struct();
result.prediction = struct( ...
    'key',            char(predKey), ...
    'label',          char(predLabel), ...
    'confidence',     confidence, ...
    'interpretation', interpretationFor(predKey, predLabel));

result.classScores = struct( ...
    'normal',        meanScores(1), ...
    'crackle',       meanScores(2), ...
    'wheeze',        meanScores(3), ...
    'crackleWheeze', meanScores(4));

% --------------------------------------------------------- signal quality
if snrDb >= 15
    status = 'Good';
elseif snrDb >= 8
    status = 'Fair';
else
    status = 'Poor';
end
result.signalQuality = struct( ...
    'status',        status, ...
    'snr',           snrDb, ...
    'rmse',          q.RMSE, ...
    'correlation',   q.Correlation, ...
    'mse',           q.MSE, ...
    'rms',           sqrt(mean(x.^2)), ...
    'peakAmplitude', max(abs(x)), ...
    'duration',      duration, ...
    'samplingRate',  Fs, ...
    'sampleCount',   numel(x));

result.waveform = timeSeries(x, Fs, opts.maxWaveformPoints);

% ----------------------------------------------------------- preprocessing
stages = struct('key', {}, 'label', {}, 'description', {}, 'signal', {});
stages(1).key = 'original';
stages(1).label = 'Original';
stages(1).description = 'Raw uploaded recording (mono, DC removed).';
stages(1).signal = timeSeries(x, Fs, opts.maxWaveformPoints);
stages(2).key = 'filtered';
stages(2).label = 'Band-pass filtered';
stages(2).description = sprintf('Butterworth order-4 band-pass (100-%.0f Hz), zero-phase filtfilt, normalised.', min(2500, 0.45*Fs));
stages(2).signal = timeSeries(filtered, Fs, opts.maxWaveformPoints);
stages(3).key = 'denoised';
stages(3).label = 'Wavelet denoised';
stages(3).description = 'sym8 wavelet denoising (fixed-threshold, level 6).';
stages(3).signal = timeSeries(denoised, Fs, opts.maxWaveformPoints);

result.preprocessing = struct();
result.preprocessing.stages = stages;
result.preprocessing.filterResponse = filterResponse(Fs, 100);
result.preprocessing.filterSpec = struct( ...
    'bandpass',  sprintf('100-%.0f Hz', min(2500, 0.45*Fs)), ...
    'iirType',   'Butterworth IIR (order 4, zero-phase filtfilt)', ...
    'firType',   'FIR band-pass (order 100, Hamming window)', ...
    'zeroPhase', true);
result.preprocessing.metrics = struct( ...
    'snr', qd.SNR_dB, 'rmse', qd.RMSE, 'correlation', qd.Correlation, 'mse', qd.MSE);

% ---------------------------------------------------------- segmentation
segOut = struct('id', {}, 'start', {}, 'end', {}, 'duration', {}, 'phase', {});
for i = 1:nValid
    segOut(i).id = segStruct(i).index;
    segOut(i).start = segStruct(i).startSec;
    segOut(i).end = segStruct(i).endSec;
    segOut(i).duration = segStruct(i).durationSec;
    segOut(i).phase = segStruct(i).phase;
end
if fallbackWhole
    segMethod = 'Automatic energy-envelope segmentation produced no usable cycle; the whole recording was analysed as a single cycle (approximate).';
else
    segMethod = 'Automatic energy-envelope segmentation (annotation-free, approximate). ICBHI training used clinical annotation files.';
end
result.segmentation = struct( ...
    'segments', {num2cell(segOut)}, ...
    'selectedSegmentId', segOut(1).id, ...
    'cyclesAnalyzed', nValid, ...
    'method', segMethod);

% --------------------------------------------------------------- features
result.features = buildFeatures(ctx, segStruct(1).rawVec, segStruct(1).signal, ...
    filtered, Fs, opts);

% --------------------------------------------------------------- PCA
meanScaled = mean(segScaled, 1);
result.pca = buildPCA(ctx, meanScaled, predKey, predLabel, opts);

% ----------------------------------------------------------- machine learning
result.machineLearning = buildML(ctx);

% --------------------------------------------------------- explainability
result.explainability = buildExplainability(ctx);

% ------------------------------------------------------------- reliability
result.reliability = struct( ...
    'segmentsAnalyzed', nValid, ...
    'modelStatus', 'Ready', ...
    'predictionStability', stability, ...
    'agreementRate', agreementRate, ...
    'classAgreement', classAgreement);

% ---------------------------------------------------------------- meta
result.meta = struct( ...
    'fileName', fileName, ...
    'analyzedAt', datestr(now, 'yyyy-mm-ddTHH:MM:SS'), ...
    'isDemo', false, ...
    'engine', 'MATLAB R2024a - Part 4 trained models (SVM / Random Forest / kNN / Ensemble)');

result = sanitizeStruct(result);
end

% ============================================================ local helpers
function [scaled, canon] = predictCycle(ctx, vec, colOf)
v1 = vec(ctx.maskFeatures);
v2 = v1(ctx.maskVariance);
bad = ~isfinite(v2);
if any(bad)
    v2(bad) = ctx.featureMeans(bad);
end
scaled = (v2 - ctx.featureMeans) ./ ctx.featureStd;
[~, sc] = predict(ctx.models.Ensemble, scaled);
sc = double(sc(:))';
canon = sc(colOf);
canon = max(canon, 0);
if sum(canon) > 0
    canon = canon / sum(canon);
end
end

function ts = timeSeries(y, Fs, maxPoints)
y = double(y(:));
N = numel(y);
step = max(1, ceil(N / maxPoints));
idx = 1:step:N;
ts = struct('time', round((idx - 1) / Fs, 4), 'amplitude', round(y(idx)', 4));
end

function snrDb = estimateSNR(x, Fs)
%ESTIMATESNR  Quiet-vs-loud frame energy ratio (dB) of the analysed signal.
x = double(x(:));
win = max(1, round(0.05 * Fs));
nFrames = floor(numel(x) / win);
if nFrames < 4
    snrDb = 0;
    return;
end
frames = reshape(x(1:nFrames*win), win, nFrames);
framePower = mean(frames.^2, 1);
p = sort(framePower);
noiseLevel  = p(max(1, round(0.10 * numel(p))));
signalLevel = p(max(1, round(0.90 * numel(p))));
snrDb = 10 * log10((signalLevel + eps) / (noiseLevel + eps));
end

function fr = filterResponse(Fs, nPoints)
lo = 100;
hi = min(2500, 0.45 * Fs);
[b, a] = butter(4, [lo hi] / (Fs / 2), 'bandpass');
try
    bfir = fir1(100, [lo hi] / (Fs / 2), 'bandpass');
catch
    bfir = b;
end
nfft = 256;
[hiir, f] = freqz(b, a, nfft, Fs);
[hfir, ~] = freqz(bfir, 1, nfft, Fs);
f = f(:);
hiirDb = 20 * log10(abs(hiir(:)) + eps);
hfirDb = 20 * log10(abs(hfir(:)) + eps);
maxHz = min(8000, Fs / 2);
keep = f <= maxHz;
f = f(keep); hiirDb = hiirDb(keep); hfirDb = hfirDb(keep);
if numel(f) > nPoints
    idx = round(linspace(1, numel(f), nPoints));
    f = f(idx); hiirDb = hiirDb(idx); hfirDb = hfirDb(idx);
end
fr = struct('frequency', round(f', 1), 'iirDb', round(hiirDb', 2), 'firDb', round(hfirDb', 2));
end

function feats = buildFeatures(ctx, rawVec, cycleSignal, filtered, Fs, opts)
groupsSpec = { ...
    'time',      'Time-Domain',           14, 'Amplitude, energy, statistical and complexity descriptors.'; ...
    'frequency', 'Frequency-Domain',      14, 'Spectral shape: centroid, spread, roll-off, flatness and band ratios.'; ...
    'stft',      'Time-Frequency (STFT)',  9, 'Short-time spectral statistics (centroid, bandwidth, roll-off, flux).'; ...
    'mfcc',      'MFCC',                  52, 'Mel-frequency cepstral coefficients and their deltas (13 x mean/std).'; ...
    'wavelet',   'Wavelet',               12, 'Relative sub-band energies and entropies (5-level sym8 decomposition).'};

groups = struct('key', {}, 'label', {}, 'count', {}, 'description', {});
for i = 1:size(groupsSpec, 1)
    groups(i).key = groupsSpec{i, 1};
    groups(i).label = groupsSpec{i, 2};
    groups(i).count = groupsSpec{i, 3};
    groups(i).description = groupsSpec{i, 4};
end

features = struct('name', {}, 'group', {}, 'value', {});
for i = 1:numel(rawVec)
    features(i).name  = char(ctx.featureNames101(i));
    features(i).group = char(ctx.featureGroup101(i));
    features(i).value = rawVec(i);
end

dist = struct('group', {}, 'mean', {}, 'spread', {});
for i = 1:size(groupsSpec, 1)
    gk = groupsSpec{i, 1};
    vals = rawVec(ctx.featureGroup101 == gk);
    dist(i).group  = gk;
    dist(i).mean   = mean(vals);
    dist(i).spread = std(vals);
end

% MFCC heat-map (coefficients x frames) from the analysed signal
M = mfccMatrix(filtered, Fs);              % frames x 13
if size(M, 1) > opts.maxMFCCCols
    idx = round(linspace(1, size(M, 1), opts.maxMFCCCols));
    M = M(idx, :);
end
M = M';                                    % 13 x frames
rows = "C" + string(1:size(M, 1));
cols = "f" + string(1:size(M, 2));
mfcc = struct('rows', rows, 'cols', cols, 'values', round(M, 3));

spect = buildSpectrogram(filtered, Fs, opts);
w = waveletLevels(cycleSignal);

feats = struct( ...
    'total', 101, ...
    'groups', groups, ...
    'features', features, ...
    'mfcc', mfcc, ...
    'spectrogram', spect, ...
    'wavelet', w, ...
    'distribution', dist);
end

function spec = buildSpectrogram(x, Fs, opts)
x = double(x(:));
N = numel(x);
win = min(512, N);
if win < 64
    win = N;
end
nover = floor(0.5 * win);
if nover >= win
    nover = floor(win/2);
end
nfft = max(512, 2^nextpow2(win));
[S, F, T] = spectrogram(x, hamming(win), nover, nfft, Fs);
vals = 20 * log10(abs(S) + eps);           % freq x time
keep = F <= min(opts.maxSpectrogramHz, Fs/2);
vals = vals(keep, :);
F = F(keep);
if numel(F) > opts.maxSpectrogramBins
    idx = round(linspace(1, numel(F), opts.maxSpectrogramBins));
    vals = vals(idx, :);
    F = F(idx);
end
if size(vals, 2) > opts.maxSpectrogramFrames
    idx = round(linspace(1, size(vals, 2), opts.maxSpectrogramFrames));
    vals = vals(:, idx);
    T = T(idx);
end
spec = struct('frequencies', round(F(:)', 1), 'times', round(T(:)', 3), ...
    'values', round(vals', 2));
end

function pca = buildPCA(ctx, meanScaled, predKey, predLabel, opts)
pca = struct( ...
    'points', struct('pc1', {}, 'pc2', {}, 'label', {}, 'classKey', {}), ...
    'explainedVariance', [0 0], ...
    'cumulativeVariance', 0, ...
    'uploadPoint', struct('pc1', 0, 'pc2', 0, 'label', char(predLabel), 'classKey', char(predKey)));
if ~ctx.hasPCA
    return;
end
scores    = double(ctx.pca.Scores);
explained = double(ctx.pca.Explained);
cumVar    = double(ctx.pca.CumulativeVariance);
mu        = double(ctx.pca.Mean(:)');
coeff     = double(ctx.pca.Coefficients);

canonKeys   = ["normal", "crackle", "wheeze", "crackleWheeze"];
canonLabels = ["Normal", "Crackle", "Wheeze", "Crackle + Wheeze"];

sAll = lower(string(ctx.yTrain));
isCW = contains(sAll, "crackle") & contains(sAll, "wheeze");
isC  = contains(sAll, "crackle") & ~isCW;
isW  = contains(sAll, "wheeze") & ~isCW & ~isC;
keyOf = repmat("normal", size(sAll));
keyOf(isC) = "crackle"; keyOf(isW) = "wheeze"; keyOf(isCW) = "crackleWheeze";

pts = struct('pc1', {}, 'pc2', {}, 'label', {}, 'classKey', {});
for c = 1:numel(canonKeys)
    idx = find(keyOf == canonKeys(c));
    if isempty(idx), continue; end
    if numel(idx) > opts.maxPCAPoints
        idx = idx(round(linspace(1, numel(idx), opts.maxPCAPoints)));
    end
    for k = idx(:)'
        pts(end+1) = struct('pc1', round(scores(k,1), 3), 'pc2', round(scores(k,2), 3), ...
            'label', char(canonLabels(c)), 'classKey', char(canonKeys(c))); %#ok<AGROW>
    end
end

% project this recording's mean scaled feature vector onto the PCA basis
if isempty(meanScaled) || numel(meanScaled) ~= size(coeff, 2)
    meanScaled = zeros(1, size(coeff, 2));
end
z = (meanScaled - mu) * coeff;
pts(end+1) = struct('pc1', round(z(1), 3), 'pc2', round(z(2), 3), ...
    'label', 'This recording', 'classKey', char(predKey)); %#ok<AGROW>

pca.points = pts;
if numel(explained) >= 2
    pca.explainedVariance = [explained(1)/100, explained(2)/100];
end
if numel(cumVar) >= 2
    pca.cumulativeVariance = cumVar(2) / 100;
elseif ~isempty(cumVar)
    pca.cumulativeVariance = cumVar(end) / 100;
end
pca.uploadPoint = struct('pc1', round(z(1), 3), 'pc2', round(z(2), 3), ...
    'label', 'This recording', 'classKey', char(predKey));
end

function ml = buildML(ctx)
comp = ctx.comparison;
names = {'SVM', 'Random Forest', 'KNN', 'Feature Ensemble'};
shorts = {'SVM', 'RF', 'KNN', 'ENS'};
models = struct('name', {}, 'shortName', {}, 'metrics', {}, 'isActive', {});
for i = 1:numel(comp.Model)
    nm = char(comp.Model(i));
    j = find(strcmpi(names, nm), 1);
    if isempty(j), sn = nm; else, sn = shorts{j}; end
    models(i).name = nm;
    models(i).shortName = sn;
    models(i).metrics = struct( ...
        'accuracy',         comp.Accuracy(i), ...
        'balancedAccuracy', comp.BalancedAccuracy(i), ...
        'precision',        comp.MacroPrecision(i), ...
        'recall',           comp.MacroRecall(i), ...
        'f1',               comp.MacroF1(i));
    models(i).isActive = strcmpi(nm, 'Feature Ensemble');
end

cm = ctx.confusion.Ensemble;
labels = strings(1, numel(cm.classNames));
for i = 1:numel(cm.classNames)
    labels(i) = displayLabel(keyFromLabel(cm.classNames(i)));
end

ml = struct( ...
    'models', models, ...
    'activeModel', 'Feature Ensemble', ...
    'confusionMatrix', struct('labels', labels, 'matrix', cm.matrix));
end

function ex = buildExplainability(ctx)
ex = struct('topFeatures', struct('name', {}, 'group', {}, 'importance', {}));
if isempty(ctx.featureImportance)
    return;
end
imp = double(ctx.featureImportance(:)');
imp(~isfinite(imp)) = 0;
if sum(imp) > 0
    imp = imp / sum(imp);
end
[~, order] = sort(imp, 'descend');
topN = min(12, numel(order));
tf = struct('name', {}, 'group', {}, 'importance', {});
for i = 1:topN
    k = order(i);
    tf(i).name = char(ctx.featureNames(k));
    tf(i).group = char(ctx.featureGroups(k));
    tf(i).importance = imp(k);
end
ex.topFeatures = tf;
end

function k = keyFromLabel(lbl)
s = lower(strtrim(string(lbl)));
s = replace(s, " + ", "+");
if contains(s, "crackle") && contains(s, "wheeze")
    k = "crackleWheeze";
elseif contains(s, "crackle")
    k = "crackle";
elseif contains(s, "wheeze")
    k = "wheeze";
else
    k = "normal";
end
end

function lbl = displayLabel(k)
switch k
    case "normal",        lbl = "Normal";
    case "crackle",       lbl = "Crackle";
    case "wheeze",        lbl = "Wheeze";
    case "crackleWheeze", lbl = "Crackle + Wheeze";
    otherwise,            lbl = "Normal";
end
end

function txt = interpretationFor(key, label)
switch key
    case "normal"
        txt = "No prominent abnormal continuous or discontinuous sound pattern was detected in the analysed respiratory cycles. This is a research model output, not a clinical interpretation.";
    case "crackle"
        txt = "A discontinuous (crackling) sound pattern was detected in the analysed respiratory cycles. This is a research model output, not a clinical interpretation.";
    case "wheeze"
        txt = "A continuous (wheezing) sound pattern was detected in the analysed respiratory cycles. This is a research model output, not a clinical interpretation.";
    case "crackleWheeze"
        txt = "Both crackling and wheezing sound patterns were detected in the analysed respiratory cycles. This is a research model output, not a clinical interpretation.";
    otherwise
        txt = "Detected respiratory sound pattern: " + string(label) + ". This is a research model output, not a clinical interpretation.";
end
end

function out = sanitizeStruct(in)
if isstruct(in)
    if numel(in) > 1
        out = in;
        for e = 1:numel(in)
            fn = fieldnames(in(e));
            for i = 1:numel(fn)
                out(e).(fn{i}) = sanitizeStruct(in(e).(fn{i}));
            end
        end
    else
        out = in;
        fn = fieldnames(in);
        for i = 1:numel(fn)
            out.(fn{i}) = sanitizeStruct(in.(fn{i}));
        end
    end
elseif islogical(in)
    out = in;
elseif isnumeric(in)
    out = double(in);
    out(~isfinite(out)) = 0;
else
    out = in;
end
end
