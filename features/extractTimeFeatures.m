function features = extractTimeFeatures(x, Fs)

% ============================================================
% TIME-DOMAIN FEATURE EXTRACTION
% ============================================================

x = x(:);

if isempty(x)
    error('Input signal is empty.');
end

% Remove DC component
x = x - mean(x);

N = length(x);

% ------------------------------------------------------------
% Basic statistical features
% ------------------------------------------------------------

meanValue = mean(x);
stdValue  = std(x);
variance  = var(x);

rmsValue = rms(x);

peakValue = max(abs(x));

% Peak-to-RMS ratio / crest factor
crestFactor = peakValue / (rmsValue + eps);

% Energy
energy = sum(x.^2);

% Mean absolute amplitude
meanAbsolute = mean(abs(x));

% ------------------------------------------------------------
% Zero Crossing Rate
% ------------------------------------------------------------

signChanges = sum(abs(diff(sign(x))) > 0);

zeroCrossingRate = signChanges / max(N - 1, 1);

% ------------------------------------------------------------
% Higher-order statistics
% ------------------------------------------------------------

skewnessValue = skewness(x);

kurtosisValue = kurtosis(x);

% ------------------------------------------------------------
% Signal entropy
% ------------------------------------------------------------

powerSignal = x.^2;

probability = powerSignal ./ (sum(powerSignal) + eps);

entropyValue = -sum(probability .* log2(probability + eps));

% ------------------------------------------------------------
% Dynamic range
% ------------------------------------------------------------

dynamicRange = max(x) - min(x);

% ------------------------------------------------------------
% Duration
% ------------------------------------------------------------

duration = N / Fs;

% ------------------------------------------------------------
% Store features
% ------------------------------------------------------------

features.Mean = meanValue;
features.Std = stdValue;
features.Variance = variance;

features.RMS = rmsValue;
features.Peak = peakValue;
features.CrestFactor = crestFactor;

features.Energy = energy;
features.MeanAbsolute = meanAbsolute;

features.ZeroCrossingRate = zeroCrossingRate;

features.Skewness = skewnessValue;
features.Kurtosis = kurtosisValue;

features.Entropy = entropyValue;

features.DynamicRange = dynamicRange;

features.Duration = duration;

end